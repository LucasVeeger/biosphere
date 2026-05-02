package handlers

import (
	"encoding/json"
	"net/http"

	"go_backend/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// shared point row (all point hardware entities share the same select shape)
type hwPointRow struct {
	ID            string  `gorm:"column:id"`
	LocationID    string  `gorm:"column:location_id"`
	Coordinate    string  `gorm:"column:coordinate"`
	ControlUnitID *string `gorm:"column:control_unit_id"`
	TypeVal       string  `gorm:"column:type_val"`
	Extra         string  `gorm:"column:extra"` // name or description, reused per type
}

// ── Sensor ───────────────────────────────────────────────────────────────────

type CreateSensorRequest struct {
	LocationID    string  `json:"location_id" binding:"required"`
	ControlUnitID *string `json:"control_unit_id"`
}

type SensorResponse struct {
	ID            string          `json:"id"`
	LocationID    string          `json:"location_id"`
	Coordinate    json.RawMessage `json:"coordinate"`
	ControlUnitID *string         `json:"control_unit_id,omitempty"`
}

func ListSensors(c *gin.Context) {
	type row struct {
		ID            string  `gorm:"column:id"`
		LocationID    string  `gorm:"column:location_id"`
		Coordinate    string  `gorm:"column:coordinate"`
		ControlUnitID *string `gorm:"column:control_unit_id"`
	}
	var rows []row
	db.DB.Raw(`SELECT s.id, s.location_id, ST_AsGeoJSON(l.coordinate) as coordinate, s.control_unit_id
		FROM sensors s JOIN locations l ON l.id = s.location_id`).Scan(&rows)
	resp := make([]SensorResponse, len(rows))
	for i, r := range rows {
		resp[i] = SensorResponse{r.ID, r.LocationID, json.RawMessage(r.Coordinate), r.ControlUnitID}
	}
	c.JSON(http.StatusOK, resp)
}

func CreateSensor(c *gin.Context) {
	var req CreateSensorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	id := uuid.New()
	if err := db.DB.Exec(`INSERT INTO sensors (id, location_id, control_unit_id) VALUES (?, ?, ?)`,
		id, req.LocationID, req.ControlUnitID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	type row struct {
		ID            string  `gorm:"column:id"`
		LocationID    string  `gorm:"column:location_id"`
		Coordinate    string  `gorm:"column:coordinate"`
		ControlUnitID *string `gorm:"column:control_unit_id"`
	}
	var r row
	db.DB.Raw(`SELECT s.id, s.location_id, ST_AsGeoJSON(l.coordinate) as coordinate, s.control_unit_id
		FROM sensors s JOIN locations l ON l.id = s.location_id WHERE s.id = ?`, id).Scan(&r)
	c.JSON(http.StatusCreated, SensorResponse{r.ID, r.LocationID, json.RawMessage(r.Coordinate), r.ControlUnitID})
}

func DeleteSensor(c *gin.Context) {
	deleteWithLocation("sensors", c.Param("id"))
	c.Status(http.StatusNoContent)
}

// ── WaterPump ─────────────────────────────────────────────────────────────────

type CreateWaterPumpRequest struct {
	LocationID    string  `json:"location_id" binding:"required"`
	ControlUnitID *string `json:"control_unit_id"`
}

type WaterPumpResponse struct {
	ID            string          `json:"id"`
	LocationID    string          `json:"location_id"`
	Coordinate    json.RawMessage `json:"coordinate"`
	ControlUnitID *string         `json:"control_unit_id,omitempty"`
}

func ListWaterPumps(c *gin.Context) {
	type row struct {
		ID            string  `gorm:"column:id"`
		LocationID    string  `gorm:"column:location_id"`
		Coordinate    string  `gorm:"column:coordinate"`
		ControlUnitID *string `gorm:"column:control_unit_id"`
	}
	var rows []row
	db.DB.Raw(`SELECT p.id, p.location_id, ST_AsGeoJSON(l.coordinate) as coordinate, p.control_unit_id
		FROM water_pumps p JOIN locations l ON l.id = p.location_id`).Scan(&rows)
	resp := make([]WaterPumpResponse, len(rows))
	for i, r := range rows {
		resp[i] = WaterPumpResponse{r.ID, r.LocationID, json.RawMessage(r.Coordinate), r.ControlUnitID}
	}
	c.JSON(http.StatusOK, resp)
}

func CreateWaterPump(c *gin.Context) {
	var req CreateWaterPumpRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	id := uuid.New()
	if err := db.DB.Exec(`INSERT INTO water_pumps (id, location_id, control_unit_id) VALUES (?, ?, ?)`,
		id, req.LocationID, req.ControlUnitID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	type row struct {
		ID            string  `gorm:"column:id"`
		LocationID    string  `gorm:"column:location_id"`
		Coordinate    string  `gorm:"column:coordinate"`
		ControlUnitID *string `gorm:"column:control_unit_id"`
	}
	var r row
	db.DB.Raw(`SELECT p.id, p.location_id, ST_AsGeoJSON(l.coordinate) as coordinate, p.control_unit_id
		FROM water_pumps p JOIN locations l ON l.id = p.location_id WHERE p.id = ?`, id).Scan(&r)
	c.JSON(http.StatusCreated, WaterPumpResponse{r.ID, r.LocationID, json.RawMessage(r.Coordinate), r.ControlUnitID})
}

func DeleteWaterPump(c *gin.Context) {
	deleteWithLocation("water_pumps", c.Param("id"))
	c.Status(http.StatusNoContent)
}

// ── WaterOutlet ───────────────────────────────────────────────────────────────

type CreateWaterOutletRequest struct {
	LocationID string `json:"location_id" binding:"required"`
	PumpID     string `json:"pump_id" binding:"required"`
}

type WaterOutletResponse struct {
	ID         string          `json:"id"`
	LocationID string          `json:"location_id"`
	Coordinate json.RawMessage `json:"coordinate"`
	PumpID     string          `json:"pump_id"`
}

func ListWaterOutlets(c *gin.Context) {
	type row struct {
		ID         string `gorm:"column:id"`
		LocationID string `gorm:"column:location_id"`
		Coordinate string `gorm:"column:coordinate"`
		PumpID     string `gorm:"column:pump_id"`
	}
	var rows []row
	db.DB.Raw(`SELECT o.id, o.location_id, ST_AsGeoJSON(l.coordinate) as coordinate, o.pump_id
		FROM water_outlets o JOIN locations l ON l.id = o.location_id`).Scan(&rows)
	resp := make([]WaterOutletResponse, len(rows))
	for i, r := range rows {
		resp[i] = WaterOutletResponse{r.ID, r.LocationID, json.RawMessage(r.Coordinate), r.PumpID}
	}
	c.JSON(http.StatusOK, resp)
}

func CreateWaterOutlet(c *gin.Context) {
	var req CreateWaterOutletRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	id := uuid.New()
	if err := db.DB.Exec(`INSERT INTO water_outlets (id, location_id, pump_id) VALUES (?, ?, ?)`,
		id, req.LocationID, req.PumpID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	type row struct {
		ID         string `gorm:"column:id"`
		LocationID string `gorm:"column:location_id"`
		Coordinate string `gorm:"column:coordinate"`
		PumpID     string `gorm:"column:pump_id"`
	}
	var r row
	db.DB.Raw(`SELECT o.id, o.location_id, ST_AsGeoJSON(l.coordinate) as coordinate, o.pump_id
		FROM water_outlets o JOIN locations l ON l.id = o.location_id WHERE o.id = ?`, id).Scan(&r)
	c.JSON(http.StatusCreated, WaterOutletResponse{r.ID, r.LocationID, json.RawMessage(r.Coordinate), r.PumpID})
}

func DeleteWaterOutlet(c *gin.Context) {
	deleteWithLocation("water_outlets", c.Param("id"))
	c.Status(http.StatusNoContent)
}

// ── ControlUnit ───────────────────────────────────────────────────────────────

type CreateControlUnitRequest struct {
	Name                string  `json:"name" binding:"required"`
	Description         string  `json:"description"`
	LocationID          string  `json:"location_id" binding:"required"`
	ParentControlUnitID *string `json:"parent_control_unit_id"`
}

type ControlUnitResponse struct {
	ID                  string          `json:"id"`
	Name                string          `json:"name"`
	Description         string          `json:"description"`
	LocationID          string          `json:"location_id"`
	Coordinate          json.RawMessage `json:"coordinate"`
	ParentControlUnitID *string         `json:"parent_control_unit_id,omitempty"`
}

func ListControlUnits(c *gin.Context) {
	type row struct {
		ID                  string  `gorm:"column:id"`
		Name                string  `gorm:"column:name"`
		Description         string  `gorm:"column:description"`
		LocationID          string  `gorm:"column:location_id"`
		Coordinate          string  `gorm:"column:coordinate"`
		ParentControlUnitID *string `gorm:"column:parent_control_unit_id"`
	}
	var rows []row
	db.DB.Raw(`SELECT cu.id, cu.name, cu.description, cu.location_id, ST_AsGeoJSON(l.coordinate) as coordinate, cu.parent_control_unit_id
		FROM control_units cu JOIN locations l ON l.id = cu.location_id`).Scan(&rows)
	resp := make([]ControlUnitResponse, len(rows))
	for i, r := range rows {
		resp[i] = ControlUnitResponse{r.ID, r.Name, r.Description, r.LocationID, json.RawMessage(r.Coordinate), r.ParentControlUnitID}
	}
	c.JSON(http.StatusOK, resp)
}

func CreateControlUnit(c *gin.Context) {
	var req CreateControlUnitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	id := uuid.New()
	if err := db.DB.Exec(`INSERT INTO control_units (id, name, description, location_id, parent_control_unit_id) VALUES (?, ?, ?, ?, ?)`,
		id, req.Name, req.Description, req.LocationID, req.ParentControlUnitID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	type row struct {
		ID                  string  `gorm:"column:id"`
		Name                string  `gorm:"column:name"`
		Description         string  `gorm:"column:description"`
		LocationID          string  `gorm:"column:location_id"`
		Coordinate          string  `gorm:"column:coordinate"`
		ParentControlUnitID *string `gorm:"column:parent_control_unit_id"`
	}
	var r row
	db.DB.Raw(`SELECT cu.id, cu.name, cu.description, cu.location_id, ST_AsGeoJSON(l.coordinate) as coordinate, cu.parent_control_unit_id
		FROM control_units cu JOIN locations l ON l.id = cu.location_id WHERE cu.id = ?`, id).Scan(&r)
	c.JSON(http.StatusCreated, ControlUnitResponse{r.ID, r.Name, r.Description, r.LocationID, json.RawMessage(r.Coordinate), r.ParentControlUnitID})
}

func DeleteControlUnit(c *gin.Context) {
	deleteWithLocation("control_units", c.Param("id"))
	c.Status(http.StatusNoContent)
}

// ── ArtificialLightUnit ───────────────────────────────────────────────────────

type CreateLightUnitRequest struct {
	Type          string  `json:"type" binding:"required,oneof=led hps"`
	LocationID    string  `json:"location_id" binding:"required"`
	ControlUnitID *string `json:"control_unit_id"`
}

type LightUnitResponse struct {
	ID            string          `json:"id"`
	Type          string          `json:"type"`
	LocationID    string          `json:"location_id"`
	Coordinate    json.RawMessage `json:"coordinate"`
	ControlUnitID *string         `json:"control_unit_id,omitempty"`
}

func ListLightUnits(c *gin.Context) {
	type row struct {
		ID            string  `gorm:"column:id"`
		Type          string  `gorm:"column:type"`
		LocationID    string  `gorm:"column:location_id"`
		Coordinate    string  `gorm:"column:coordinate"`
		ControlUnitID *string `gorm:"column:control_unit_id"`
	}
	var rows []row
	db.DB.Raw(`SELECT lu.id, lu.type, lu.location_id, ST_AsGeoJSON(l.coordinate) as coordinate, lu.control_unit_id
		FROM artifical_light_units lu JOIN locations l ON l.id = lu.location_id`).Scan(&rows)
	resp := make([]LightUnitResponse, len(rows))
	for i, r := range rows {
		resp[i] = LightUnitResponse{r.ID, r.Type, r.LocationID, json.RawMessage(r.Coordinate), r.ControlUnitID}
	}
	c.JSON(http.StatusOK, resp)
}

func CreateLightUnit(c *gin.Context) {
	var req CreateLightUnitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	id := uuid.New()
	if err := db.DB.Exec(`INSERT INTO artifical_light_units (id, type, location_id, control_unit_id) VALUES (?, ?, ?, ?)`,
		id, req.Type, req.LocationID, req.ControlUnitID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	type row struct {
		ID            string  `gorm:"column:id"`
		Type          string  `gorm:"column:type"`
		LocationID    string  `gorm:"column:location_id"`
		Coordinate    string  `gorm:"column:coordinate"`
		ControlUnitID *string `gorm:"column:control_unit_id"`
	}
	var r row
	db.DB.Raw(`SELECT lu.id, lu.type, lu.location_id, ST_AsGeoJSON(l.coordinate) as coordinate, lu.control_unit_id
		FROM artifical_light_units lu JOIN locations l ON l.id = lu.location_id WHERE lu.id = ?`, id).Scan(&r)
	c.JSON(http.StatusCreated, LightUnitResponse{r.ID, r.Type, r.LocationID, json.RawMessage(r.Coordinate), r.ControlUnitID})
}

func DeleteLightUnit(c *gin.Context) {
	deleteWithLocation("artifical_light_units", c.Param("id"))
	c.Status(http.StatusNoContent)
}

// ── ArtificialLightArea ───────────────────────────────────────────────────────

type CreateLightAreaRequest struct {
	Type          string  `json:"type" binding:"required,oneof=led hps"`
	VolumeID      string  `json:"volume_id" binding:"required"`
	ControlUnitID *string `json:"control_unit_id"`
}

type LightAreaResponse struct {
	ID            string  `json:"id"`
	Type          string  `json:"type"`
	VolumeID      string  `json:"volume_id"`
	ControlUnitID *string `json:"control_unit_id,omitempty"`
}

func ListLightAreas(c *gin.Context) {
	type row struct {
		ID            string  `gorm:"column:id"`
		Type          string  `gorm:"column:type"`
		VolumeID      string  `gorm:"column:volume_id"`
		ControlUnitID *string `gorm:"column:control_unit_id"`
	}
	query := `SELECT id, type, volume_id, control_unit_id FROM artifical_light_areas`
	args := []any{}
	if vid := c.Query("volume_id"); vid != "" {
		query += ` WHERE volume_id = ?`
		args = append(args, vid)
	}
	var rows []row
	db.DB.Raw(query, args...).Scan(&rows)
	resp := make([]LightAreaResponse, len(rows))
	for i, r := range rows {
		resp[i] = LightAreaResponse{r.ID, r.Type, r.VolumeID, r.ControlUnitID}
	}
	c.JSON(http.StatusOK, resp)
}

func CreateLightArea(c *gin.Context) {
	var req CreateLightAreaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	id := uuid.New()
	if err := db.DB.Exec(`INSERT INTO artifical_light_areas (id, type, volume_id, control_unit_id) VALUES (?, ?, ?, ?)`,
		id, req.Type, req.VolumeID, req.ControlUnitID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, LightAreaResponse{id.String(), req.Type, req.VolumeID, req.ControlUnitID})
}

func DeleteLightArea(c *gin.Context) {
	db.DB.Exec(`DELETE FROM artifical_light_areas WHERE id = ?`, c.Param("id"))
	c.Status(http.StatusNoContent)
}
