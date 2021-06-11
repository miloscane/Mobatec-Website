//Initialize Slides
var totalSlides	=	document.getElementsByClassName("homeProjectsWrap")[0].getElementsByClassName("slide").length;
var slides		=	document.getElementsByClassName("homeProjectsWrap")[0].getElementsByClassName("slide");
var slidesWrap	=	document.getElementsByClassName("homeProjectsWrap")[0].getElementsByClassName("slidesWrap")[0];
slidesWrap.dataset.currentslide	=	0;


function showSlide(increment){
	var currentSlide 	=	Number(slidesWrap.dataset.currentslide);
	var slideToShow		=	currentSlide+increment;
	var lastSlide		=	totalSlides-1;
	if(slideToShow>=totalSlides){
		slideToShow		=	0
	}else if(slideToShow<0){
		slideToShow		=	lastSlide;
	}
	slidesWrap.dataset.currentslide	=	slideToShow;
	for(var i=0;i<totalSlides;i++){
		if(i!=slideToShow){
			slides[i].classList.add("inactive");
		}else{
			slides[i].classList.remove("inactive")
		}
		slides[i].style.left	=	eval(100*(slideToShow-i))+"%"
		/*if(i<slideToShow){
			slides[i].style.left	=	eval(100*(i+1))+"%";
		}else if(i>slideToShow){
			slides[i].style.left	=	eval(100*(i))+"%";
		}else if(i==slideToShow){
			slides[i].style.left	=	"0%";
		}*/
	}
}

showSlide(3);