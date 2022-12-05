import axios from 'axios';
import cheerio from 'cheerio';
import { getDist, parseDate } from './utils.js';
const url = 'https://www.e-leiloes.pt/index.aspx/GetData';
const referrer = 'https://www.e-leiloes.pt/listagem.aspx';
const iterCount = 4;
const maxCount = 9999;
class Scrapper {
	async fetchData(code, count) {
		return axios
			.post(
				url,
				{
					listaTotal: 'false',
					contagem: '' + count,
					pesquisa: code,
				},
				{
					credentials: 'include',
					headers: {
						'User-Agent':
							'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.11; rv:78.0) Gecko/20100101 Firefox/78.0',
						Accept: 'application/json, text/javascript, */*; q=0.01',
						'Accept-Language': 'en-US,en;q=0.5',
						'Content-Type': 'application/json; charset=utf-8',
						'X-Requested-With': 'XMLHttpRequest',
						Pragma: 'no-cache',
						'Cache-Control': 'no-cache',
					},
					referrer,
					mode: 'cors',
				}
			)
			.then((res) => {
				return JSON.parse(res.data.d);
			});
	}
	async fetchNumber(code) {
		return axios
			.post(
				url,
				{
					listaTotal: 'true',
					contagem: '0',
					pesquisa: code,
				},
				{
					credentials: 'include',
					headers: {
						'User-Agent':
							'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.11; rv:78.0) Gecko/20100101 Firefox/78.0',
						Accept: 'application/json, text/javascript, */*; q=0.01',
						'Accept-Language': 'en-US,en;q=0.5',
						'Content-Type': 'application/json; charset=utf-8',
						'X-Requested-With': 'XMLHttpRequest',
						Pragma: 'no-cache',
						'Cache-Control': 'no-cache',
					},
					referrer,
					mode: 'cors',
				}
			)
			.then((res) => {
				return JSON.parse(res.data.d);
			});
	}

	getDist(entryInfo) {
		return getDist(entryInfo);
	}

	async getIds(cached, code) {
		let count = iterCount;
		let alreadyFetched = false;
		let alreadyClosed = false;
		const entries = [];
		const entriesNumber = +(await this.fetchNumber(code)).total;
		while (
			entries.length < maxCount &&
			!alreadyFetched &&
			!alreadyClosed &&
			count < entriesNumber
		) {
			const newEntries = await this.fetchData(code, count);
			for (const entry of newEntries) {
				if (cached[entry.referencia]) {
					alreadyFetched = true;
				}
				if (parseDate(entry['dataFim']) < new Date()) {
					alreadyClosed = true;
				}
				entries.push(entry.referencia);
			}

			count += iterCount;
		}
		return entries;
	}

	async getEntryInfo(cached, id) {
		if (cached[id]) return cached[id];
		console.log('UPDATE - Fetching', id);
		const parseDecimal = (str) => {
			return +str.replace(',', '.').replace(/\s/gm, '');
		};
		let link = `https://www.e-leiloes.pt/info.aspx?lo=${id}`;
		if (id.includes('NP')) {
			link = `https://www.e-leiloes.pt/particular.aspx?np=${id}`;
		}

		// Fetch HTML of the page we want to scrape
		const { data } = await axios.get(link);
		// Load HTML we fetched in the previous line
		const $ = cheerio.load(data);
		const html = $.html();
		const info = {};
		info.link = link;
		const preTitle = /name:\s'(.*)'/gm.exec(html)[1];
		info.id = preTitle.split('-')[0].trim();
		info.title = preTitle.split('-')[1].trim();
		const preDescription = /description:\s'(.*)'/gm.exec(html)[1];
		info.type = /Tipo:\s(.*?)(?=\s\|)/gm.exec(preDescription)[1];
		info.subType = /Subtipo:\s(.*?)(?=\s\|)/gm.exec(preDescription)[1];
		info.baseValue = parseDecimal(
			/Valor Base:\s(.*?)(?=\s€\s\|)/gm.exec(preDescription)[1]
		);
		info.openValue = parseDecimal(
			/Valor Abertura:\s(.*?)(?=\s€\s\|)/gm.exec(preDescription)[1]
		);
		info.minimumValue = parseDecimal(
			/Valor Mínimo:\s(.*?)(?=\s€\s\|)/gm.exec(preDescription)[1]
		);
		info.start = /Início:\s(.*?)(?=\s\|)/gm.exec(preDescription)[1];
		info.end = /Fim:\s(.*)/gm.exec(preDescription)[1];
		info.images = [];
		const preImages = /var\simagens\s=\s'(.*)'/gm.exec(html)[1];
		const images = [...preImages.matchAll(/url\((.*?)(?=\))/gm)];
		for (const image of images) {
			info.images.push('https://www.e-leiloes.pt/' + image[1]);
		}
		info.details = {};
		$('#InfoBemDescricao')
			.find('b')
			.each(function () {
				let nextText = $(this.nextSibling).text().trim();
				if (!nextText) {
					nextText = $(this.parent.next.next).text().trim();
				}
				if (!nextText) {
					nextText = $(this.parent.next).text().trim();
				}
				info.details[$(this).text().trim().replace(':', '')] = nextText;
			});

		cached[id] = info;
		return info;
	}
}
const scrapper = new Scrapper();
export default scrapper;
