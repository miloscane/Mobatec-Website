function openResponsiveMenu(){
	var menu	=	document.getElementById("main-menu");
	var menuIcon=	document.getElementById("responsive-menu-opener");
	if(menu.classList.contains("opened")){
		menu.classList.remove("opened");
		menuIcon.classList.remove("responsiveMenuOpened");
		if (window.pageYOffset == 0 && document.getElementById("main-nav-wrap").classList.contains("main-nav-wrap-colored")) {
			document.getElementById("main-nav-wrap").classList.remove("main-nav-wrap-colored");
		}
	}else{
		//Open Menu
		menu.classList.add("opened");
		menuIcon.classList.add("responsiveMenuOpened");
		if(!document.getElementById("main-nav-wrap").classList.contains("main-nav-wrap-colored")){
			document.getElementById("main-nav-wrap").classList.add("main-nav-wrap-colored");
		}
	}
}