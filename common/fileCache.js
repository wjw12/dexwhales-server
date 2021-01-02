const fs = require('fs')
const cache = require('node-file-cache').create()

export default class FileCache {
    constructor(_prefix, _lifetime) {
        this.prefix = _prefix || ""
        this.options = {
            life: _lifetime || 360
        }
        this.keys = {} // store keys that's been used in the cache
    }
    
    set(key, value) {
        const prefixedKey = this.prefix + key.toString()
        cache.set(prefixedKey, value, this.options)
        this.keys[key.toString()] = true
    }
    
    get(key) {
        const prefixedKey = this.prefix + key.toString()
        return cache.get(prefixedKey)
    }
    
    dumpToFile(callback) {
        var filename = this.prefix + '.cache'
        var data = {}
        for (var key of Object.keys(this.keys)) {
            const prefixedKey = this.prefix + key
            const value = cache.get(prefixedKey)
            if (value) {
                data[key] = value
            }
        }
        fs.writeFile(filename, JSON.stringify(data), function (err) {
            if (err) { console.error(`write ${filename} failed`) }
            else { 
                console.log(`write ${filename} successful`) 
                if (callback) callback()
            }
        })
    }
    
    loadFromFile(callback) {
        var filename = this.prefix + '.cache'
        var self = this
        fs.readFile(filename, (err, data) => {
            if (!err) { 
                console.log(`load ${filename} successful`) 
                data = JSON.parse(data)
                for (var key of Object.keys(data)) {
                    const value = data[key]
                    self.set(key, value)
                }
                if (callback) callback()
            }
        })
    }

}