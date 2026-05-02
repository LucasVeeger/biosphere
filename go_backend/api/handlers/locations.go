package handlers

import (
	"encoding/json"
	"net/http"

	"go_backend/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CreateLocationRequest struct {
	Name        string          `json:"name" binding:"required"`
	Description string          `json:"description"`
	Coordinate  json.RawMessage `json:"coordinate" binding:"required"` // GeoJSON Point
}

type LocationResponse struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Coordinate  json.RawMessage `json:"coordinate"`
}

type locationRow struct {
	ID          string `gorm:"column:id"`
	Name        string `gorm:"column:name"`
	Description string `gorm:"column:description"`
	Coordinate  string `gorm:"column:coordinate"`
}

func (r locationRow) toResponse() LocationResponse {
	return LocationResponse{
		ID:          r.ID,
		Name:        r.Name,
		Description: r.Description,
		Coordinate:  json.RawMessage(r.Coordinate),
	}
}

const locationSelect = `SELECT id, name, description, ST_AsGeoJSON(coordinate) as coordinate FROM locations`

func CreateLocation(c *gin.Context) {
	var req CreateLocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	id := uuid.New()
	err := db.DB.Exec(
		`INSERT INTO locations (id, name, description, coordinate) VALUES (?, ?, ?, ST_GeomFromGeoJSON(?))`,
		id, req.Name, req.Description, string(req.Coordinate),
	).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var row locationRow
	db.DB.Raw(locationSelect+` WHERE id = ?`, id).Scan(&row)
	c.JSON(http.StatusCreated, row.toResponse())
}

func GetLocation(c *gin.Context) {
	id := c.Param("id")
	var row locationRow
	result := db.DB.Raw(locationSelect+` WHERE id = ?`, id).Scan(&row)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, row.toResponse())
}
