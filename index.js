import cache from './cache.js';
import {
	PropertiesCat,
	VehiclesCat,
	EquipmentsCat,
	FurnitureCat,
	MachinesCat,
	RightsCat,
	Financas,
} from './categories.js';

import { parseDate } from './utils.js';
import { generateHtml } from './htmlGen.js';
import express from 'express';
import path from 'path';
import scrapperAlt from './scrapperAlt.js';
const app = express();
const port = 3000;
const forceUpdate = false;

// load cached values
let { cached, lastTimeUpdated, cities } = cache.load();

// initiate list of categories
const categories = [
	new PropertiesCat(),
	new VehiclesCat(),
	new EquipmentsCat(),
	new FurnitureCat(),
	new MachinesCat(),
	new RightsCat(),
	new Financas(),
];

function getFilterParameters(req) {
	const parameters = {
		type: req.query.type,
		radius: req.query.radius,
		search: req.query.search,
		order: req.query.order,
	};
	return parameters;
}

function normStr(str) {
	try {
		return ('' + str)
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase();
	} catch (error) {
		console.log('' + str);
		return '';
	}
}

function hasSearchStr(entry, pattern) {
	for (const detail in entry.details) {
		if (entry.details[detail]) {
			if (normStr(entry.details[detail]).includes(normStr(pattern))) {
				return true;
			}
		}
	}
	return false;
}

function filter(entries, params) {
	console.log('Filtering', params);
	entries = entries.filter((e) => parseDate(e.end) >= new Date());

	if (params.radius) {
		entries = entries.filter((e) => e.distance < +params.radius);
	}
	if (params.type) {
		entries = entries.filter((e) => e.type === params.type);
	}
	if (params.search) {
		entries = entries.filter((e) => hasSearchStr(e, params.search));
	}
	if (params.order) {
		if (params.order === 'start') {
			entries = entries.sort((a, b) => a.start - b.start);
		}
		if (params.order === 'end') {
			entries = entries.sort((a, b) => b.end - a.end);
		}
		if (params.order === 'dist') {
			entries = entries.sort((a, b) => a.distance - b.distance);
		}
		if (params.order === 'value') {
			entries = entries.sort((a, b) => a.openValue - b.openValue);
		}
	}

	return entries;
}
app.get('/index.css', function (req, res) {
	res.sendFile(path.resolve('./index.css'));
});
app.get('/index.html', function (req, res) {
	refreshData().then((entries) => {
		const filterParameters = getFilterParameters(req);
		const results = filter(entries, filterParameters);
		generateHtml(results.slice(0, 100));
		return res.sendFile(path.resolve('./index.html'));
	});
});
app.get('/', (req, res) => {
	refreshData().then((entries) => {
		const filterParameters = getFilterParameters(req);
		const results = filter(entries, filterParameters);
		return res.json(results);
	});
});

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});

async function refreshData() {
	if (lastTimeUpdated && !forceUpdate) {
		const hrsSinceLastUpdate =
			(new Date() - new Date(lastTimeUpdated)) / 3600000;
		console.log('Time since last update', hrsSinceLastUpdate.toFixed(1), 'hrs');
		if (hrsSinceLastUpdate < 1) {
			return Object.values(cached);
		}
	}
	console.log('Updating cached data');
	// for each category get the latest entries
	for (const cat of categories) {
		await cat.getActiveEntries(cached, cities);
	}

	// save cache
	lastTimeUpdated = new Date();
	cache.save({ cached, lastTimeUpdated, cities });
	return Object.values(cached);

	// // filter by active
	// let active = [];
	// const allEntries = Object.values(cached);

	// console.log('Cached entries', allEntries.length);
	// active = allEntries.filter((e) => {
	// 	return parseDate(e.end) >= new Date();
	// });

	// console.log('Filtered only active', active.length);

	// let filtered = [];
	// // filter by category
	// for (const cat of categories) {
	// 	filtered = filtered.concat(cat.filter(active));
	// }
	// console.log('Filtered distance', filtered.length);

	// filtered = filtered.sort((a, b) => {
	// 	return parseDate(b.start) - parseDate(a.start);
	// });

	// generateHtml(filtered);
}
