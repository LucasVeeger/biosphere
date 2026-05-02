package handlers

import "go_backend/db"

// deleteWithLocation deletes a row from table by id, then deletes the
// associated location row. Call this for any entity that owns a location.
func deleteWithLocation(table, id string) {
	var r struct {
		LocationID string `gorm:"column:location_id"`
	}
	db.DB.Raw("SELECT location_id FROM "+table+" WHERE id = ?", id).Scan(&r)
	db.DB.Exec("DELETE FROM "+table+" WHERE id = ?", id)
	if r.LocationID != "" {
		db.DB.Exec("DELETE FROM locations WHERE id = ?", r.LocationID)
	}
}
