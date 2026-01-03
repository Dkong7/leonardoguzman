/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4k04aakagagvnpw")

  // remove
  collection.schema.removeField("vwngvyj2")

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4k04aakagagvnpw")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vwngvyj2",
    "name": "categoria",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  return dao.saveCollection(collection)
})
