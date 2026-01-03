/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("dwbuh7n54tqh44q")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "87jxwnty",
    "name": "tipo",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "live",
        "academic"
      ]
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("dwbuh7n54tqh44q")

  // remove
  collection.schema.removeField("87jxwnty")

  return dao.saveCollection(collection)
})
