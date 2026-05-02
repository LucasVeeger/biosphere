package models

import "github.com/google/uuid"

// Species: The biological template
type Species struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name        string    `gorm:"size:255;not null"`
	LatinName   string    `gorm:"column:latin_name"`
	Description string
}

// FloraUnit: Individual organisms or recursive arrays
type FloraUnit struct {
	ID   uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name string    `gorm:"size:255;not null"`
	
	// Biological Link
	SpeciesID uuid.UUID  `gorm:"type:uuid;not null"`
	Species   Species    `gorm:"foreignKey:SpeciesID"`
	
	// Spatial Link
	LocationID uuid.UUID `gorm:"type:uuid;not null"`
	Location   Location  `gorm:"foreignKey:LocationID"`

	// Structural Link (Which plot/area is it in?)
	FloraAreaID *uuid.UUID `gorm:"type:uuid"`
	FloraArea   *FloraArea  `gorm:"foreignKey:FloraAreaID"`
}

// FloraArea: A collection of vegetation within a defined boundary
type FloraArea struct {
	ID     uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name   string    `gorm:"size:255"`

	// Biological Link
	SpeciesID uuid.UUID  `gorm:"type:uuid;not null"`
	Species   Species    `gorm:"foreignKey:SpeciesID"`
	
	// Density
	Density   			float64    `gorm:"type:float"` 	// Units per square meter, NULL if density is undefined
	DensityDescription 	string    						// stems, fruits, stems, etc.

	// Spatial Link
	VolumeID uuid.UUID `gorm:"type:uuid;not null"`
	Volume   Volume      `gorm:"foreignKey:VolumeID"`

	
}
