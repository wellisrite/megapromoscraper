const Nightmare = require('nightmare')
const cheerio = require('cheerio')
const vo = require('vo')
const request = require('request');
const Promise = require('bluebird');
const fs = require('fs');

exports.main = function(){
	//get Categories list
	exports.getCategoryList()
	//get Promotion Links
	.then(exports.getCategoryPromosLink)
	//get All promos detail
	.then(res=>{
		var promosi={};
		Object.keys(res).forEach(function(i){
			res[i] = [].concat.apply([],res[i]);
		});
		Object.keys(res).forEach(function(i,index){
			promise = exports.getCategoryDetails(res[i]);
			if(index!=Object.keys(res).length-1){
				promise.then(res=>{promosi[i]=res;console.log('Fetching All promos in '+i+' category done');});
			}
			else{
				promise.then(res=>
				{
					promosi[i]=res;console.log('Fetching All promos in '+i+' category done');
					jsonfile=(JSON.stringify(promosi, null, "\t"));
					fs.writeFile("solution.json", jsonfile, function(err) {
					    if(err) {
					        return console.log(err);
					    }
					    console.log("solution.json was saved!");
					}); 
				});
			}
		});
	})
	.catch(err=>{
		console.log('error occured : '+err);
	})
}	

exports.getCategoryDetails = function(promolinks){
		promises=[];
		promolinks.forEach(function(j){
			promises.push(exports.getPromotionDetails(j));
		});
		return Promise.all(promises);
}

exports.getCategoryList = function(){
	var products=[];
	var categories = [];
	var url = 'https://www.bankmega.com/promolainnya.php';
	return promise = new Promise(function(resolve,reject){
		request(url, function (error, response, html) {
		  if (!error && response.statusCode == 200) {

			    var $ = cheerio.load(html);
			
			    //get the products
			    // var temp = $('#contentpromolain2 > div:nth-child(1) > div > div');	    
			    // temp.each(function(i,element){
			    // 	product = element.attribs.id;
			    // 	if(product!=null&&product!="promolain_inside")
			    // 		products.push(product);
			    // });

			    // get the categories
			    var temp=($('#subcatpromo > div > img'));
			    temp.each(function(i,element){
			    	category = {selector :'#'+element.attribs.id,name:element.attribs.title};
			    	categories.push(category);
			    });
			    resolve(categories);
			}
		});
	});
}
//promo links are manually mined through headless browser as no hardcodes allowed in url 
exports.getCategoryPromosLink = function (categories){
	return promise = new Promise(function(resolve,reject){
		vo(getLinks(categories))(function(err,result){
				resolve(result);
		});
	})
	function* getLinks(categories){
		promosi={};
		for (var i = 0;i < categories.length;i++) {
			const nightmare = Nightmare({ show: false})
			console.log('Fetching All promo links in '+categories[i].name);
			var numofpages;
			var currentpage=1;
			yield nightmare
				.goto('https://www.bankmega.com/promolainnya.php')
				.wait()
				.click(categories[i].selector)
				.wait(3000)

			var numofpages = yield nightmare
				.evaluate(function(){
					if($('#paging1').attr('title')!=null){
						var pages= $('#paging1').attr('title');
						pages = pages.split(' ');
						return numofpages = parseInt(pages[pages.length-1]);
					}else{
						return numofpages = 0;
					}
				})
			promosi[categories[i].name]=[];
			while(currentpage <= numofpages) {
				promosi[categories[i].name].push(yield nightmare 
					.evaluate(function(){
						var promosinpage = $('#promolain > li > a');
						var pro = [];
						promosinpage.each(function(index,value){
							pro.push(value.href);
						});
						$('#contentpromolain2 > div:nth-child(3) > div > table > tbody > tr').children().slice(-1).children().click();
						return pro;
					}));
				
				yield nightmare
					.wait(5000)

				currentpage++;
			}
			yield nightmare
			.end()	
		}
		return promosi;
	}
}

exports.getPromotionDetails= function (url){
	const req = request;
	baseURI='https://www.bankmega.com';
	return new Promise(function(resolve){
		req(url, function (error, response, html) {
		  if (!error && response.statusCode == 200) {
		  	  	var $ = cheerio.load(html);
		  	  	imgurl= $('#contentpromolain2 > div.keteranganinside > img').attr('src');
		  	  	if(imgurl==null){
		  	  		imgurl=$('#contentpromolain2 > div.keteranganinside > a > img').attr('src');
		  	  	}
			    var startdate=$('#contentpromolain2 > div.periode > b:nth-child(1)').text();
			    startdate = startdate.slice(0,startdate.length-3);
			    results = {
			    	title : $('#contentpromolain2 > div.titleinside > h3').text(),
			    	imgurl : baseURI+imgurl,
			    	areapromo : $('#contentpromolain2 > div.area > b').text(),
			    	promostartdate : startdate,
			    	promoendadate : $('#contentpromolain2 > div.periode > b:nth-child(2)').text()
		    	}
		   		resolve(results);
		  }
		});
	});
}

