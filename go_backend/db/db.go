package db

import (
	"fmt"
	"log"
	"os"

	"go_backend/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Init() {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=require",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("failed to connect to database:", err)
	}
}

func RunMigrations() {
	err := DB.AutoMigrate(
		&models.Location{},
		&models.Volume{},
		&models.Sensor{},
		&models.ArtificalLightUnit{},
		&models.ArtificalLightArea{},
		&models.WaterPump{},
		&models.WaterOutlet{},
		&models.ControlUnit{},
		&models.Species{},
		&models.FloraUnit{},
		&models.FloraArea{},
	)
	if err != nil {
		log.Fatal("migration failed:", err)
	}
}
