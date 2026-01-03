/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4k04aakagagvnpw")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "igsco839",
    "name": "tipo",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "academico",
        "merch"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ppougopg",
    "name": "galeria",
    "type": "file",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "mimeTypes": [
        "image/png",
        "image/jpeg",
        "image/webp",
        "video/webm",
        "image/avif"
      ],
      "thumbs": [],
      "maxSelect": 10,
      "maxSize": 5242880,
      "protected": false
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hew3ul80",
    "name": "nombre_en",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "zwqs28rg",
    "name": "descripcion_en",
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
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4k04aakagagvnpw")

  // remove
  collection.schema.removeField("igsco839")

  // remove
  collection.schema.removeField("ppougopg")

  // remove
  collection.schema.removeField("hew3ul80")

  // remove
  collection.schema.removeField("zwqs28rg")

  return dao.saveCollection(collection)
})
