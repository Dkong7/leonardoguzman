/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4k04aakagagvnpw")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tkcfcjw8",
    "name": "precio_cop",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "noDecimal": false
    }
  }))

  // update
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
        "merch",
        "musica"
      ]
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4k04aakagagvnpw")

  // remove
  collection.schema.removeField("tkcfcjw8")

  // update
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

  return dao.saveCollection(collection)
})
