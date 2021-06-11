var yearPrints	=	document.getElementsByClassName('yearPrint');
for(var i=0;i<yearPrints.length;i++){
	yearPrints[i].innerHTML	=	new Date().getFullYear();
}