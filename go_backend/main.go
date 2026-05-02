package main

import (
	"flag"
	"fmt"

	"go_backend/api"
	"go_backend/db"
)

func main() {
	migrate := flag.Bool("migrate", false, "run database migrations and exit")
	flag.Parse()

	db.Init()

	if *migrate {
		db.RunMigrations()
		fmt.Println("✅ migrations complete")
		return
	}

	fmt.Println("🌱 biosphere api running on :8080")
	api.StartServer()
}
