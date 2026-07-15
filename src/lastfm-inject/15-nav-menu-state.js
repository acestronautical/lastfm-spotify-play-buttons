
        if(!navMenuState) return;

        navMenuState.menu.setAttribute("data-open", open ? "true" : "false");
        navMenuState.toggle.setAttribute("aria-expanded", open ? "true" : "false");

    }


    function setMenuItemBusy(item, busy){
        if(busy){
            item.setAttribute("aria-disabled", "true");
        } else {
            item.removeAttribute("aria-disabled");
        }
    }


    // Suppress the outside-click auto-close while a long-running
    // action (CSV import etc.) streams progress into the menu.
    // Escape still closes as an escape hatch.
    function setNavMenuBusy(busy){
        if(!navMenuState) return;
        if(busy){
            navMenuState.wrap.setAttribute("data-busy", "true");
        } else {
            navMenuState.wrap.removeAttribute("data-busy");
        }
    }


    function setMenuStatus(action, text){

        const el = document.querySelector(
            `.spotify-nav-menu-status[data-status-for="${action}"]`
        );

        if(!el) return;

        if(text){
            el.hidden = false;
            el.textContent = text;
        } else {
            el.hidden = true;
            el.textContent = "";
        }

    }



