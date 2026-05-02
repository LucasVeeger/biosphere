package handlers

import (
	"encoding/json"
	"net/http"

	"go_backend/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ── FloraArea ────────────────────────────────────────────────────────────────

type CreateFloraAreaRequest struct {
	Name               string  `json:"name"`
	VolumeID           string  `json:"volume_id" binding:"required"`
	SpeciesID          string  `json:"species_id" binding:"required"`
	Density            float64 `json:"density"`
	DensityDescription string  `json:"density_description"`
}

type FloraAreaResponse struct {
	ID                 string `json:"id"`
	Name               string `json:"name"`
	VolumeID           string `json:"volume_id"`
	SpeciesID          string `json:"species_id"`
	SpeciesName        string `json:"species_name"`
	Density            float64 `json:"density"`
	DensityDescription string  `json:"density_description"`
}

type floraAreaRow struct {
	ID                 string  `gorm:"column:id"`
	Name               string  `gorm:"column:name"`
	VolumeID           string  `gorm:"column:volume_id"`
	SpeciesID          string  `gorm:"column:species_id"`
	SpeciesName        string  `gorm:"column:species_name"`
	Density            float64 `gorm:"column:density"`
	DensityDescription string  `gorm:"column:density_description"`
}

const floraAreaSelect = `
SELECT fa.id, fa.name, fa.volume_id, fa.species_id, sp.name as species_name, fa.density, fa.density_description
FROM flora_areas fa
JOIN species sp ON sp.id = fa.species_id`

func ListFloraAreas(c *gin.Context) {
	query := floraAreaSelect
	args := []any{}
	if vid := c.Query("volume_id"); vid != "" {
		query += ` WHERE fa.volume_id = ?`
		args = append(args, vid)
	}
	var rows []floraAreaRow
	if err := db.DB.Raw(query, args...).Scan(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	resp := make([]FloraAreaResponse, len(rows))
	for i, r := range rows {
		resp[i] = FloraAreaResponse{r.ID, r.Name, r.VolumeID, r.SpeciesID, r.SpeciesName, r.Density, r.DensityDescription}
	}
	c.JSON(http.StatusOK, resp)
}

func CreateFloraArea(c *gin.Context) {
	var req CreateFloraAreaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	id := uuid.New()
	if err := db.DB.Exec(
		`INSERT INTO flora_areas (id, name, volume_id, species_id, density, density_description) VALUES (?, ?, ?, ?, ?, ?)`,
		id, req.Name, req.VolumeID, req.SpeciesID, req.Density, req.DensityDescription,
	).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var row floraAreaRow
	db.DB.Raw(floraAreaSelect+` WHERE fa.id = ?`, id).Scan(&row)
	c.JSON(http.StatusCreated, FloraAreaResponse{row.ID, row.Name, row.VolumeID, row.SpeciesID, row.SpeciesName, row.Density, row.DensityDescription})
}

func DeleteFloraArea(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Exec(`DELETE FROM flora_areas WHERE id = ?`, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// ── FloraUnit ────────────────────────────────────────────────────────────────

type CreateFloraUnitRequest struct {
	Name        string  `json:"name" binding:"required"`
	LocationID  string  `json:"location_id" binding:"required"`
	SpeciesID   string  `json:"species_id" binding:"required"`
	FloraAreaID *string `json:"flora_area_id"`
}

type FloraUnitResponse struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	LocationID  string          `json:"location_id"`
	Coordinate  json.RawMessage `json:"coordinate"`
	SpeciesID   string          `json:"species_id"`
	SpeciesName string          `json:"species_name"`
	FloraAreaID *string         `json:"flora_area_id,omitempty"`
}

type floraUnitRow struct {
	ID          string  `gorm:"column:id"`
	Name        string  `gorm:"column:name"`
	LocationID  string  `gorm:"column:location_id"`
	Coordinate  string  `gorm:"column:coordinate"`
	SpeciesID   string  `gorm:"column:species_id"`
	SpeciesName string  `gorm:"column:species_name"`
	FloraAreaID *string `gorm:"column:flora_area_id"`
}

const floraUnitSelect = `
SELECT fu.id, fu.name, fu.location_id, ST_AsGeoJSON(l.coordinate) as coordinate,
       fu.species_id, sp.name as species_name, fu.flora_area_id
FROM flora_units fu
JOIN locations l ON l.id = fu.location_id
JOIN species sp ON sp.id = fu.species_id`

func ListFloraUnits(c *gin.Context) {
	query := floraUnitSelect
	args := []any{}
	if aid := c.Query("flora_area_id"); aid != "" {
		query += ` WHERE fu.flora_area_id = ?`
		args = append(args, aid)
	}
	var rows []floraUnitRow
	if err := db.DB.Raw(query, args...).Scan(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	resp := make([]FloraUnitResponse, len(rows))
	for i, r := range rows {
		resp[i] = FloraUnitResponse{r.ID, r.Name, r.LocationID, json.RawMessage(r.Coordinate), r.SpeciesID, r.SpeciesName, r.FloraAreaID}
	}
	c.JSON(http.StatusOK, resp)
}

func CreateFloraUnit(c *gin.Context) {
	var req CreateFloraUnitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	id := uuid.New()
	if err := db.DB.Exec(
		`INSERT INTO flora_units (id, name, location_id, species_id, flora_area_id) VALUES (?, ?, ?, ?, ?)`,
		id, req.Name, req.LocationID, req.SpeciesID, req.FloraAreaID,
	).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var row floraUnitRow
	db.DB.Raw(floraUnitSelect+` WHERE fu.id = ?`, id).Scan(&row)
	c.JSON(http.StatusCreated, FloraUnitResponse{row.ID, row.Name, row.LocationID, json.RawMessage(row.Coordinate), row.SpeciesID, row.SpeciesName, row.FloraAreaID})
}

func DeleteFloraUnit(c *gin.Context) {
	deleteWithLocation("flora_units", c.Param("id"))
	c.Status(http.StatusNoContent)
}
