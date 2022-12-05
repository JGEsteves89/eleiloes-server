import axios from 'axios';
import cheerio from 'cheerio';
import zlib from 'zlib';
import fetch from 'node-fetch';
import { parseDate } from './utils.js';

const maxCount = 9999;
class ScrapperAlt {
	async fetchData(page) {
		// Fetch HTML of the page we want to scrape
		const { data } = await axios.get(
			`https://vendas.portaldasfinancas.gov.pt/bens/consultaVendasCurso.action?page=${page}&freguesia=&concelho=&distrito=&dataMin=&maximo=&tipoConsulta=*&dataMax=&minimo=&modalidade=*&tipoBem=`,
			{ responseType: 'arraybuffer', decompress: true }
		);
		const $ = await new Promise((resolve, reject) => {
			zlib.gunzip(data, function (error, result) {
				const rawData = result.toString('latin1');
				const $ = cheerio.load(rawData);
				return resolve($);
			});
		});
		//document.querySelector("body > table:nth-child(4) > tbody > tr > td:nth-child(2) > table > tbody > tr:nth-child(7) > td > div > table > tbody > tr:nth-child(2) > td:nth-child(1) > span:nth-child(2)")
		///html/body/table[2]/tbody/tr/td[2]/table/tbody/tr[7]/td/div/table/tbody/tr[2]/td[1]/span[2]
		//table.w100 > tbody:nth-child(1) > tr:nth-child(7) > td:nth-child(1) > div:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(1) > span:nth-child(2)

		const entries = [];
		$(
			'tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(1) > span:nth-child(2)'
		).each(function () {
			entries.push($(this).text().trim());
		});

		// $('.w95').each(function () {
		// 	const details = {};
		// 	let attrName = null;
		// 	const type = $(this)
		// 		.find('[class="info-table-title nowrap w20"]')
		// 		.text()
		// 		.trim();
		// 	$(this)
		// 		.find('.info-element>span')
		// 		.each(function () {
		// 			const txt = $(this).text().trim();
		// 			if (txt) {
		// 				if (!attrName) {
		// 					attrName = txt;
		// 				} else {
		// 					details[attrName.replace(':', '')] = txt;
		// 					attrName = null;
		// 				}
		// 			}
		// 		});
		// 	if (details['Nº Venda']) {
		// 		const id = details['Nº Venda'];
		// 		details.id = id;
		// 		details.type = type;
		// 		entries[id] = details;
		// 	}
		// });
		return entries;
	}

	async getCity(city) {
		const response = await fetch(
			`https://api.geoapify.com/v1/geocode/search?city=${city}&country=Portugal&format=json&apiKey=11c7840fcafb4651a45b20b651429b8e`
		);
		const res = await response.json();
		return res.results[0];
	}
	async getIds(cached) {
		let page = 1;
		let alreadyFetched = false;
		let alreadyClosed = false;
		const entries = [];
		while (entries.length < maxCount && !alreadyFetched && !alreadyClosed) {
			const newEntries = await this.fetchData(page);
			if (newEntries.length === 0) break;
			for (const id of newEntries) {
				if (cached[id]) {
					alreadyFetched = true;
					console.log('Entry already cached in');
				}
				if (entries.includes(id)) {
					alreadyFetched = true;
				}
				entries.push(id);
			}
			page++;
		}
		return entries;
	}

	getEntryValue(entry) {
		let formattedValue = entry.details['Preço Base de Venda']
			.replace('€ ', '')
			.replace('.', '')
			.replace(',', '.');
		if (formattedValue.includes(' ')) {
			formattedValue = formattedValue.split(' ')[0];
		}
		if (isNaN(+formattedValue)) {
			console.warn(
				'Could not parse value',
				entry.details['Preço Base de Venda']
			);
			return 0;
		}
		return +formattedValue;
	}

	async getEntryInfo(cached, id) {
		if (cached[id]) return cached[id];
		const idS = id.split('.');
		const link = `https://vendas.portaldasfinancas.gov.pt/bens/detalheVenda.action?idVenda=${idS[2]}&sf=${idS[0]}&ano=${idS[1]}`;
		console.log('UPDATE - Fetching', id);
		const { data } = await axios.get(link, {
			responseType: 'arraybuffer',
			decompress: true,
		});
		const $ = await new Promise((resolve, reject) => {
			zlib.gunzip(data, function (error, result) {
				const rawData = result.toString('latin1');
				const $ = cheerio.load(rawData);
				return resolve($);
			});
		});
		const info = {};
		info.link = link;
		info.id = id;
		info.details = {};
		info.type = $('[class="info-table-title nowrap w30 left"]').text().trim();
		info.title = info.type + ' Finanças';
		$('[class="info-element-title"]').each(function () {
			const attr = $(this).text().trim().replace(':', '');
			const value = $(this).next().text().trim();
			if (attr && value) {
				info.details[attr] = value;
			}
		});
		info.details['Descrição'] = info.details['Características'];
		info.openValue = this.getEntryValue(info);
		info.images = [];
		$('.right img').each(function () {
			const img = $(this).attr('src');
			info.images.push(img);
		});
		info.end = info.details['Data/hora limites para aceitaçao das propostas'];
		info.start = info.details['Local, prazo e horas para examinar o bem'];

		// info.link = link;
		// const preTitle = /name:\s'(.*)'/gm.exec(html)[1];
		// info.id = preTitle.split('-')[0].trim();
		// info.title = preTitle.split('-')[1].trim();
		// const preDescription = /description:\s'(.*)'/gm.exec(html)[1];
		// info.type = /Tipo:\s(.*?)(?=\s\|)/gm.exec(preDescription)[1];
		// info.subType = /Subtipo:\s(.*?)(?=\s\|)/gm.exec(preDescription)[1];
		// info.baseValue = parseDecimal(
		// 	/Valor Base:\s(.*?)(?=\s€\s\|)/gm.exec(preDescription)[1]
		// );
		// info.openValue = parseDecimal(
		// 	/Valor Abertura:\s(.*?)(?=\s€\s\|)/gm.exec(preDescription)[1]
		// );
		// info.minimumValue = parseDecimal(
		// 	/Valor Mínimo:\s(.*?)(?=\s€\s\|)/gm.exec(preDescription)[1]
		// );
		// info.start = /Início:\s(.*?)(?=\s\|)/gm.exec(preDescription)[1];
		// info.end = /Fim:\s(.*)/gm.exec(preDescription)[1];
		// info.images = [];
		// const preImages = /var\simagens\s=\s'(.*)'/gm.exec(html)[1];
		// const images = [...preImages.matchAll(/url\((.*?)(?=\))/gm)];
		// for (const image of images) {
		// 	info.images.push('https://www.e-leiloes.pt/' + image[1]);
		// }
		// info.details = {};
		// $('#InfoBemDescricao')
		// 	.find('b')
		// 	.each(function () {
		// 		let nextText = $(this.nextSibling).text().trim();
		// 		if (!nextText) {
		// 			nextText = $(this.parent.next.next).text().trim();
		// 		}
		// 		if (!nextText) {
		// 			nextText = $(this.parent.next).text().trim();
		// 		}
		// 		info.details[$(this).text().trim().replace(':', '')] = nextText;
		// 	});
		cached[id] = info;
		return info;
	}
}
const scrapperAlt = new ScrapperAlt();
export default scrapperAlt;
