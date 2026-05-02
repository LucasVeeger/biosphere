package api

import (
	"go_backend/api/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func StartServer() {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins: []string{"http://localhost:5173", "http://localhost:4173"},
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Origin", "Content-Type", "Accept"},
	}))

	v1 := r.Group("/api")
	{
		// Geo
		v1.POST("/locations", handlers.CreateLocation)
		v1.GET("/locations/:id", handlers.GetLocation)

		v1.GET("/volumes", handlers.ListVolumes)
		v1.POST("/volumes", handlers.CreateVolume)
		v1.GET("/volumes/:id", handlers.GetVolume)
		v1.PUT("/volumes/:id", handlers.UpdateVolume)
		v1.DELETE("/volumes/:id", handlers.DeleteVolume)

		// Organic
		v1.GET("/species", handlers.ListSpecies)
		v1.POST("/species", handlers.CreateSpecies)

		v1.GET("/flora-areas", handlers.ListFloraAreas)
		v1.POST("/flora-areas", handlers.CreateFloraArea)
		v1.DELETE("/flora-areas/:id", handlers.DeleteFloraArea)

		v1.GET("/flora-units", handlers.ListFloraUnits)
		v1.POST("/flora-units", handlers.CreateFloraUnit)
		v1.DELETE("/flora-units/:id", handlers.DeleteFloraUnit)

		// Hardware
		v1.GET("/sensors", handlers.ListSensors)
		v1.POST("/sensors", handlers.CreateSensor)
		v1.DELETE("/sensors/:id", handlers.DeleteSensor)

		v1.GET("/water-pumps", handlers.ListWaterPumps)
		v1.POST("/water-pumps", handlers.CreateWaterPump)
		v1.DELETE("/water-pumps/:id", handlers.DeleteWaterPump)

		v1.GET("/water-outlets", handlers.ListWaterOutlets)
		v1.POST("/water-outlets", handlers.CreateWaterOutlet)
		v1.DELETE("/water-outlets/:id", handlers.DeleteWaterOutlet)

		v1.GET("/control-units", handlers.ListControlUnits)
		v1.POST("/control-units", handlers.CreateControlUnit)
		v1.DELETE("/control-units/:id", handlers.DeleteControlUnit)

		v1.GET("/light-units", handlers.ListLightUnits)
		v1.POST("/light-units", handlers.CreateLightUnit)
		v1.DELETE("/light-units/:id", handlers.DeleteLightUnit)

		v1.GET("/light-areas", handlers.ListLightAreas)
		v1.POST("/light-areas", handlers.CreateLightArea)
		v1.DELETE("/light-areas/:id", handlers.DeleteLightArea)
	}

	r.Run(":8080")
}
