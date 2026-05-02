package models

import "github.com/google/uuid"

type VolumeType string

const (
	VolumeTypeHome       VolumeType = "home"
	VolumeTypeGarden     VolumeType = "garden"
	VolumeTypeGreenhouse VolumeType = "greenhouse"
	VolumeTypeWindow     VolumeType = "window" // face of a parent volume
)

// Location: A specific 3D Point — coordinates must be unique (no two entities share a point)
type Location struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name        string    `gorm:"size:255;not null"`
	Description string
	Coordinate  string    `gorm:"type:geometry(PointZ, 4326);uniqueIndex"`
}

// Volume: A 3D Volume or Boundary — volumes may overlap freely
type Volume struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name         string     `gorm:"size:255;not null"`
	Type         VolumeType `gorm:"size:50;not null"`
	Boundary     string     `gorm:"type:geometry(PolygonZ, 4326)"`
	Description  string
	Transparancy float64    `gorm:"default:1"`

	// self link if volume is actually a face of a parent volume
	ParentVolumeID *uuid.UUID `gorm:"type:uuid"`
	ParentVolume   *Volume    `gorm:"foreignKey:ParentVolumeID"`
}

