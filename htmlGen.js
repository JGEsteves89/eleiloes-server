import fs from 'fs';

const TENTRY = '<!-- TEMPLATE ENTRY -->';
const TIMG = '<!-- TEMPLATE IMAGE -->';
const TDET = '<!-- TEMPLATE DETAILS -->';

function getColor(dist, max) {
	const c = [54, 126, 24];
	const f = [204, 54, 54];

	const r = Math.max(Math.min((max - dist) / max, 1), 0);

	const color = [
		(f[0] + r * (c[0] - f[0])) | 0,
		(f[1] + r * (c[1] - f[1])) | 0,
		(f[2] + r * (c[2] - f[2])) | 0,
	];
	return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

export function generateHtml(data) {
	console.log('Generating html, with', data.length);
	const template = fs.readFileSync('./index.template.html').toString();
	const entryTENTRY = template.split(TENTRY)[1].split(TENTRY)[0];
	const entryTIMG = template.split(TIMG)[1].split(TIMG)[0];
	const entryTDET = template.split(TDET)[1].split(TDET)[0];

	const entries = [];
	for (const entry of data) {
		const images = [];
		for (const image of entry.images.slice(0, 4)) {
			const imgHtml = entryTIMG
				.replace('{ENTRY_NAME}', entry.title)
				.replace('{ENTRY_LINK}', entry.link)
				.replace('{ENTRY_IMG}', image);
			images.push(imgHtml);
		}
		const details = [];
		for (const detail in entry.details) {
			const detailsHtml = entryTDET
				.replace('{DETAIL_NAME}', detail)
				.replace('{DETAIL_VALUE}', entry.details[detail]);
			details.push(detailsHtml);
		}
		const entryHtml = entryTENTRY
			.replace('{ENTRY_NAME}', entry.title)
			.replace('{ENTRY_CURRENT_VALUE}', entry.openValue)
			.replace('{ENTRY_LINK}', entry.link)
			.replace('{ENTRY_CAT}', entry.type)
			.replace('{DIST_COLOR}', getColor(entry.distance, 50))
			.replace('{ENTRY_CURRENT_DIST}', entry.distance.toFixed(1))
			.replace('{ENTRY_DESCRIPTION}', entry.details['Descrição'])
			.replace(entryTDET, details.join('\n'))
			.replace(entryTIMG, images.join('\n'));

		entries.push(entryHtml);
	}
	const final = template
		.replace(entryTENTRY, entries.join('\n'))
		.replace('{ENTRY_COUNT}', entries.length);
	fs.writeFileSync('./index.html', final);
}
