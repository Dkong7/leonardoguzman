/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("pawasgd0767jqrb")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "c3cysjjb",
    "name": "audio",
    "type": "file",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "mimeTypes": [],
      "thumbs": null,
      "maxSelect": 1,
      "maxSize": 52428800,
      "protected": false
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("pawasgd0767jqrb")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "c3cysjjb",
    "name": "audio",
    "type": "file",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "mimeTypes": null,
      "thumbs": null,
      "maxSelect": 1,
      "maxSize": 10485760,
      "protected": false
    }
  }))

  return dao.saveCollection(collection)
})
