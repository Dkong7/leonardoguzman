/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("dwbuh7n54tqh44q")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hipwesjd",
    "name": "precio",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "dga3pnml",
    "name": "precio_usd",
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

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("dwbuh7n54tqh44q")

  // remove
  collection.schema.removeField("hipwesjd")

  // remove
  collection.schema.removeField("dga3pnml")

  return dao.saveCollection(collection)
})
