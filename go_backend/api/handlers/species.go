package handlers

import (
	"net/http"

	"go_backend/db"
	"go_backend/models"

	"github.com/gin-gonic/gin"
)

type CreateSpeciesRequest struct {
	Name        string `json:"name" binding:"required"`
	LatinName   string `json:"latin_name"`
	Description string `json:"description"`
}

type SpeciesResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	LatinName   string `json:"latin_name"`
	Description string `json:"description"`
}

func toSpeciesResponse(s models.Species) SpeciesResponse {
	return SpeciesResponse{
		ID:          s.ID.String(),
		Name:        s.Name,
		LatinName:   s.LatinName,
		Description: s.Description,
	}
}

func ListSpecies(c *gin.Context) {
	var species []models.Species
	if err := db.DB.Order("name").Find(&species).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	resp := make([]SpeciesResponse, len(species))
	for i, s := range species {
		resp[i] = toSpeciesResponse(s)
	}
	c.JSON(http.StatusOK, resp)
}

func CreateSpecies(c *gin.Context) {
	var req CreateSpeciesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	s := models.Species{Name: req.Name, LatinName: req.LatinName, Description: req.Description}
	if err := db.DB.Create(&s).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, toSpeciesResponse(s))
}
