/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("dwbuh7n54tqh44q")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tqyfrjdp",
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
  const collection = dao.findCollectionByNameOrId("dwbuh7n54tqh44q")

  // remove
  collection.schema.removeField("tqyfrjdp")

  return dao.saveCollection(collection)
})
