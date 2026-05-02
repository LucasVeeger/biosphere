package models

import "github.com/google/uuid"

type SensorType string

const (
	SensorTypeTemperature 	SensorType = "temperature"
	SensorTypeHumidity    	SensorType = "humidity"
	SensorTypeLight       	SensorType = "light"
	SensorTypeSoilHumidity  SensorType = "soil_humidity"
)

type ControlUnitType string

const (
	ControlUnitTypeArduino ControlUnitType = "arduino"
	ControlUnitRaspberryPi ControlUnitType = "raspberry_pi"
)

type ArtificalLightType string

const (
	ArtificalLightSourceUnitTypeLED ArtificalLightType = "led"
	ArtificalLightSourceUnitTypeHPS ArtificalLightType = "hps"
)

type Sensor struct {
	ID uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	
	// Spatial Link
	LocationID uuid.UUID `gorm:"type:uuid;not null"`
	Location Location `gorm:"foreignKey:LocationID"`

	// Connection Link
	ControlUnitID *uuid.UUID `gorm:"type:uuid"`
	ControlUnit *ControlUnit `gorm:"foreignKey:ControlUnitID"`
}

type ArtificalLightUnit struct {
	ID uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	
	// Type
	Type ArtificalLightType 
	
	// Spatial Link
	LocationID uuid.UUID `gorm:"type:uuid;not null"`
	Location Location `gorm:"foreignKey:LocationID"`

	// Connection Link
	ControlUnitID *uuid.UUID `gorm:"type:uuid"`
	ControlUnit *ControlUnit `gorm:"foreignKey:ControlUnitID"`
}

type ArtificalLightArea struct {
	ID uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	
	// Type
	Type ArtificalLightType `gorm:"size:255;not null"`
	
	// Spatial Link
	VolumeID uuid.UUID `gorm:"type:uuid;not null"`
	Volume   Volume      `gorm:"foreignKey:VolumeID"`
	
	// Connection Link
	ControlUnitID *uuid.UUID `gorm:"type:uuid"`
	ControlUnit *ControlUnit `gorm:"foreignKey:ControlUnitID"`
}

type WaterPump struct {
	ID uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	
	// Spatial Link
	LocationID uuid.UUID `gorm:"type:uuid;not null"`
	Location Location `gorm:"foreignKey:LocationID"`
	
	// Connection Link
	ControlUnitID *uuid.UUID `gorm:"type:uuid"`
	ControlUnit *ControlUnit `gorm:"foreignKey:ControlUnitID"`

	// Outlets
	Outlets []WaterOutlet `gorm:"foreignKey:PumpID"`
}

type WaterOutlet struct {
	ID uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	
	// Spatial Link
	LocationID uuid.UUID `gorm:"type:uuid;not null"`
	Location Location `gorm:"foreignKey:LocationID"`
	
	// Pump Link
	PumpID uuid.UUID `gorm:"type:uuid;not null"`
	Pump WaterPump `gorm:"foreignKey:PumpID"`
}

type ControlUnit struct {
	ID uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name string 
	Description string
	
	// Spatial Link
	LocationID uuid.UUID `gorm:"type:uuid;not null"`
	Location Location `gorm:"foreignKey:LocationID"`

	// Self-referential: Parent control unit (for cascading control)
	ParentControlUnitID *uuid.UUID `gorm:"type:uuid"`
	ParentControlUnit *ControlUnit `gorm:"foreignKey:ParentControlUnitID"`
	
	// Children control units (for cascading control)
	ChildrenControlUnits []ControlUnit `gorm:"foreignKey:ParentControlUnitID"`
	
	// Pumps
	Pumps []WaterPump `gorm:"foreignKey:ControlUnitID"`
	
	// Lights
	Lights []ArtificalLightUnit `gorm:"foreignKey:ControlUnitID"`
	
	// Areas
	Areas []ArtificalLightArea `gorm:"foreignKey:ControlUnitID"`
	
	// Sensors
	Sensors []Sensor `gorm:"foreignKey:ControlUnitID"`
}