import fs from 'fs';
class Cache {
	constructor() {
		this.path = 'cache.json';
	}
	load() {
		try {
			return JSON.parse(fs.readFileSync(this.path));
		} catch (error) {
			return {};
		}
	}
	save(data) {
		fs.writeFileSync(this.path, JSON.stringify(data, null, 2));
	}
}
const cache = new Cache();
export default cache;
