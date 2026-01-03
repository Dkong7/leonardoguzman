/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4k04aakagagvnpw")

  // remove
  collection.schema.removeField("bbv2akl5")

  // remove
  collection.schema.removeField("oeicmqjm")

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4k04aakagagvnpw")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "bbv2akl5",
    "name": "link_pago",
    "type": "url",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "exceptDomains": null,
      "onlyDomains": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "oeicmqjm",
    "name": "imagen_url",
    "type": "url",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "exceptDomains": null,
      "onlyDomains": null
    }
  }))

  return dao.saveCollection(collection)
})
