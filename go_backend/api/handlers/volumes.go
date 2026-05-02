package handlers

import (
	"encoding/json"
	"net/http"

	"go_backend/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CreateVolumeRequest struct {
	Name           string          `json:"name" binding:"required"`
	Type           string          `json:"type" binding:"required,oneof=home garden greenhouse window"`
	Boundary       json.RawMessage `json:"boundary"`
	Description    string          `json:"description"`
	Transparency   float64         `json:"transparency"`
	ParentVolumeID *string         `json:"parent_volume_id"`
}

type VolumeResponse struct {
	ID             string          `json:"id"`
	Name           string          `json:"name"`
	Type           string          `json:"type"`
	Boundary       json.RawMessage `json:"boundary,omitempty"`
	Description    string          `json:"description"`
	Transparency   float64         `json:"transparency"`
	ParentVolumeID *string         `json:"parent_volume_id,omitempty"`
}

type volumeRow struct {
	ID             string  `gorm:"column:id"`
	Name           string  `gorm:"column:name"`
	Type           string  `gorm:"column:type"`
	Boundary       string  `gorm:"column:boundary"`
	Description    string  `gorm:"column:description"`
	Transparency   float64 `gorm:"column:transparancy"`
	ParentVolumeID *string `gorm:"column:parent_volume_id"`
}

func (r volumeRow) toResponse() VolumeResponse {
	resp := VolumeResponse{
		ID:             r.ID,
		Name:           r.Name,
		Type:           r.Type,
		Description:    r.Description,
		Transparency:   r.Transparency,
		ParentVolumeID: r.ParentVolumeID,
	}
	if r.Boundary != "" && r.Boundary != "null" {
		resp.Boundary = json.RawMessage(r.Boundary)
	}
	return resp
}

const volumeSelect = `SELECT id, name, type, ST_AsGeoJSON(boundary) as boundary, description, transparancy, parent_volume_id FROM volumes`

func ListVolumes(c *gin.Context) {
	var rows []volumeRow
	if err := db.DB.Raw(volumeSelect + ` ORDER BY name`).Scan(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	resp := make([]VolumeResponse, len(rows))
	for i, r := range rows {
		resp[i] = r.toResponse()
	}
	c.JSON(http.StatusOK, resp)
}

func CreateVolume(c *gin.Context) {
	var req CreateVolumeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	id := uuid.New()
	var err error
	if len(req.Boundary) > 0 && string(req.Boundary) != "null" {
		err = db.DB.Exec(
			`INSERT INTO volumes (id, name, type, boundary, description, transparancy, parent_volume_id) VALUES (?, ?, ?, ST_GeomFromGeoJSON(?), ?, ?, ?)`,
			id, req.Name, req.Type, string(req.Boundary), req.Description, req.Transparency, req.ParentVolumeID,
		).Error
	} else {
		err = db.DB.Exec(
			`INSERT INTO volumes (id, name, type, description, transparancy, parent_volume_id) VALUES (?, ?, ?, ?, ?, ?)`,
			id, req.Name, req.Type, req.Description, req.Transparency, req.ParentVolumeID,
		).Error
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var row volumeRow
	db.DB.Raw(volumeSelect+` WHERE id = ?`, id).Scan(&row)
	c.JSON(http.StatusCreated, row.toResponse())
}

func GetVolume(c *gin.Context) {
	id := c.Param("id")
	var row volumeRow
	result := db.DB.Raw(volumeSelect+` WHERE id = ?`, id).Scan(&row)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, row.toResponse())
}

func UpdateVolume(c *gin.Context) {
	id := c.Param("id")
	var req CreateVolumeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var err error
	if len(req.Boundary) > 0 && string(req.Boundary) != "null" {
		err = db.DB.Exec(
			`UPDATE volumes SET name=?, type=?, boundary=ST_GeomFromGeoJSON(?), description=?, transparancy=?, parent_volume_id=? WHERE id=?`,
			req.Name, req.Type, string(req.Boundary), req.Description, req.Transparency, req.ParentVolumeID, id,
		).Error
	} else {
		err = db.DB.Exec(
			`UPDATE volumes SET name=?, type=?, boundary=NULL, description=?, transparancy=?, parent_volume_id=? WHERE id=?`,
			req.Name, req.Type, req.Description, req.Transparency, req.ParentVolumeID, id,
		).Error
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var row volumeRow
	db.DB.Raw(volumeSelect+` WHERE id = ?`, id).Scan(&row)
	c.JSON(http.StatusOK, row.toResponse())
}

func DeleteVolume(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Exec(`DELETE FROM volumes WHERE id = ?`, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
