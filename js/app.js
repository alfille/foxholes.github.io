"use strict";

/* jshint esversion: 6 */

var H ; // Hole class
var G ; // Game class -- controls rules and selects display
var TV = null ; // TableView
var GV = null ; // GardenView
var O ; // Overlay control

class Holes { // all geometry info
    constructor() {
        this.ylength = 1; // for more complex shapes
        this.xlength = 5 ;
        this.geometry = "grid" ;
        this.offset = false;

    }

    status() {
        document.getElementById("line1").innerHTML =
        `${this.xlength} long &times; ${this.ylength} wide arranged in ${this.real_offset?"an offset ":"a "}${H.geometry}`;
        document.getElementById("line2").innerHTML =
        `Inspect ${this.visits} hole${this.visits==1?"":"s"}/day`;
        document.getElementById("line3").innerHTML =
        (this.poison_days==0)?`Holes not poisoned`:`Poison lasts ${this.poison_days} days`;
    }

    cookies() {
        this.xlength     = Cookie.get("length") ;
        this.ylength     = Cookie.get("width") ;
        this.geometry    = Cookie.get("geometry") ;
        this.visits      = Cookie.get("visits") ;
        this.poison_days = Cookie.get("poison_days") ;
        this.offset      = Cookie.get("offset") ;
    }
    
    validate() {
        this.xlength     = this.checkI( this.xlength    , 1, 30, 5 ) ;
        this.ylength     = this.checkI( this.ylength    , 1, 30, 1 ) ;
        this.geometry    = this.checkS( this.geometry   , ["circle","grid","triangle"], "grid" ) ;
        this.visits      = this.checkI( this.visits     , 1, 10, 1 ) ;
        this.poison_days = this.checkI( this.poison_days, 0, 7, 0 ) ;
        this.offset      = this.checkB( this.offset     , false ) ;
        if ( this.visits > this.total ) {
            // can't visit more than the total number of holes
            this.visits = this.total ;
        }
        if ( this.geometry == "triangle" ) {
            // ylength not used in triangle
            this.ylength = this.xlength ;
        }
    }
    
    checkI( x, lo, hi, def ) {
        // check if Integer
        try {
            if ( Number.isInteger(x) ) {
                if ( x < lo ) {
                    return lo;
                } else if ( x > hi ) {
                    return hi;
                }
                return x;
            } else if ( typeof(x)=="string" ) {
                return this.checkI( parseInt(x), lo, hi, def ) ;
            }
            return def;
        }
        catch(e) {
            return def;
        }
    }
    
    checkB( x, def ) {
        // check if Boolean
        try {
            if ( typeof(x) == "boolean" ) {
                return x;
            } else if ( typeof(x)=="string" ) {
                if ( x=="false" ) {
                    return false ;
                }
                if ( x=="true" ) {
                    return true ;
                }
                return def;
            }
            return !!x ;
        }
        catch(e) {
            return def;
        }
    }
        
    checkS( x, goodarray, def ) {
        // check if Boolean
        try {
            if ( goodarray.indexOf(x) > -1 ) {
                return x;
            }
            return def;
        }
        catch(e) {
            return def;
        }
    }
        
    get total() { // get total holes
        switch( this.geometry ) {
            case "grid":
            case "circle":
                return this.xlength * this.ylength ;
            case "triangle":
                return this.xlength*(this.xlength+1)/2;
            }
    }
    
    get real_offset() { // only if offset and thick
        return this.offset && (this.ylength>1) ;
    }
}
H = new Holes() ;

class GardenView {
    constructor() {
        this.svg = document.getElementById("svg_view");
        this.head = document.getElementById("top");
        this.hbutton = document.getElementById("HistoryButton");
        this.hslide = document.getElementById("Hslide");
        this.hval = document.getElementById("Hval");
        window.onresize = () => this.dimension_control();
    }

    start() {
        this.allarrows = G.fox_moves.map( (m,i) => m.map( mm => `<line id=${"arr"+i+"_"+mm} x1="0" y1="0" x2="0" y2="0" class="svg_arrow" marker-end="url(#arrowhead)" visibility="hidden" />`).join("")
            ).join("");
        this.X = [] ; // coordinates of holes
        this.Y = [] ;
        this.symbol_list = [];
        this.configure();
    }

    dimension_control() {
        if ( this.X.length == 0 ) {
            // get circle locations (get transform and calculate)
            G.foxes.forEach( (_,i) => {
                let up = document.getElementById("upper_"+i) ;
                let Cx = up.attributes.cx.value ;
                let Cy = up.attributes.cy.value ;
                let mtx = up.transform.baseVal.consolidate().matrix ;
                this.X[i] = Cx * mtx.a + Cy * mtx.c + mtx.e ;
                this.Y[i] = Cx * mtx.b + Cy * mtx.d + mtx.f ;
                });
        }
    }

    arrow_location() {
        G.fox_moves.forEach( (m,i) => m.forEach( mm => {
            let ll = document.getElementById("arr"+i+"_"+mm) ;
            ll.setAttribute( "x1", this.X[i]+"" ) ;
            ll.setAttribute( "y1", this.Y[i]+"" ) ;
            ll.setAttribute( "x2", this.X[i]*.7 + this.X[mm]*.3 +"" ) ;
            ll.setAttribute( "y2", this.Y[i]*.7 + this.Y[mm]*.3 +"" ) ;
            }) );
    }

    symbolize(s) {
        s.forEach( (ss,i) => document.getElementById("symbol_"+i).innerHTML = ss );
    }

    arrow_visibility(flist) {
        flist.forEach( (f,i) => G.fox_moves[i].forEach( m => document.getElementById("arr"+i+"_"+m).style.visibility= f?"visible":"hidden" ));
    }

    control_row(symbol_list) {
        this.symbol_list = symbol_list ;
        this.svg.innerHTML = this.create_svg("game");
            
        if ( G.number !== 0 ) {
            G.foxes.forEach( (_,i)=>document.getElementById("upper_"+i).addEventListener('click', (e) => this.click(e.target)) );
        }
        this.dimension_control() ;
        this.symbolize(symbol_list) ;
        this.arrow_visibility(G.foxes) ;
        this.arrow_location();
        if ( G.day == 0 ) {
            this.hbutton.innerText = "History ...";
        } else {
            this.hbutton.innerText = `History (${G.day})`;
        }
    }

    create_svg(display_state="game") {
        return `<svg id="svg_code" viewBox="${this.vb.x} ${this.vb.y} ${this.vb.width} ${this.vb.height}"> preserveAspectRatio="xMidYMid meet" width="100%"
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto" markerUnits="strokeWidth" >
                    <polygon points="0 0, 10 3.5, 0 7" />
                </marker>
            </defs>
            ${this.background}
            ${this.lower}
            ${this.allarrows}
            ${this.symbol}
            ${display_state=="game"?this.upper:""}
            Sorry, your browser does not support inline SVG.  
        </svg>` ;
    }

    click(target) {
        let hole = parseInt(target.id.split('_')[1]) ;
        TV.click(hole);
        target.style.strokeWidth = TV.checked(hole) ? "30" : "10" ;
    }

    layout() { // show layout of foxholes
        this.svg.innerHTML = this.create_svg("layout") ;
        this.symbolize(G.foxes.map( (_,i) => i+"" ) ); // numbers not foxes
        this.arrow_location(); // yes arrows
        this.arrow_visibility(G.foxes.map(()=>true));
    }
    
    key(e) {
        if ( O.view == "history" ) {
            switch (e.key) {
                case "ArrowLeft":
                case "PageUp":
                case "-":
                    this.hminus() ;
                    break ;
                case "ArrowRight":
                case "PageDown":
                case "+":
                    this.hplus() ;
                    break ;
                case "Home":
                    this.hstart() ;
                    break ;
                case "End":
                    this.hend() ;
                    break ;
                default:
                    return ;
                } ;
                e.preventDefault();
        }
    }

    history() { // set up to show history of foxholes
        this.hslide.min = 0;
        this.hslide.max = G.day;
        this.hend();
    }
    
    hstart() {
        this.hcurrent = 0;
        this.show_history();
    }
    hminus() {
        --this.hcurrent;
        this.show_history();
    }
    hplus() {
        ++this.hcurrent;
        this.show_history();
    }
    hend() {
        this.hcurrent = G.day;
        this.show_history();
    }

    show_history() { // show history of foxholes
        this.hslide.value = this.hcurrent ;
        this.hcurrent = this.hslide.value ;
        this.svg.innerHTML = this.create_svg("history") ;
        let date = this.hslide.value;
        this.hval.value=date;
        let obMove = G.history(date);
        this.symbolize(TV.symbols(obMove)); // numbers not foxes
        this.arrow_location(); // yes arrows
        this.arrow_visibility(obMove.foxes);
    }

    post_layout() {
        this.control_row(this.symbol_list) // restore fox symbols
        O.resume(); // back to table
    }
}

class GardenView_Triangle extends GardenView {
    configure() {
        let f = G.foxes ;
        this.vb = { // svg viewBox dimensions
            x: -200,
            y: -250,
            width: 350*(H.xlength-1)+400,
            height: 350*H.xlength+400,
        };
        this.background = "";
        this.transform  = f.map( (_,i) => { let [l,h]=Game.trisplit(i); return `transform="translate(${l*350},${h*350})"`} ) ;

        // Foxholes lower (has background) symbol (holds inhabitant) upper (for click and border)
        this.lower      = f.map( (_,i) => `<circle class="svg_hole" cx="0" cy="0" r="150" ${this.transform[i]} />`)
                           .join("");
        this.symbol     = f.map( (_,i) => `<text class="svg_symbol" x="0" y="60" id=${"symbol_"+i} ${this.transform[i]} >&nbsp;</text>`)
                           .join("");
        this.upper      = f.map( (_,i) => `<circle class="svg_click" cx="0" cy="0" r="150" ${this.transform[i]} id=${"upper_"+i}  onmouseover="this.style.stroke='red'" onmouseout="this.style.stroke='black'"/>`)
                           .join("");
    }
}

class GardenView_OffsetTriangle extends GardenView {
    configure() {
        let f = G.foxes ;
        this.vb = { // svg viewBox dimensions
            x: -200,
            y: -250,
            width: 350*(H.xlength-1)+575,
            height: 303*H.ylength+400,
        };
        this.background = "";
        this.transform  = f.map( (_,i) => { let [ll,h]=Game.trisplit(i); let l=ll+Math.trunc((H.xlength-h-1)/2) ; return `transform="translate(${l*350+(h&1)*175},${h*303})"`} ) ;

        // Foxholes lower (has background) symbol (holds inhabitant) upper (for click and border)
        this.lower      = f.map( (_,i) => `<circle class="svg_hole" cx="0" cy="0" r="150" ${this.transform[i]}/>`)
                           .join("");
        this.symbol     = f.map( (_,i) => `<text class="svg_symbol" x="0" y="60" id=${"symbol_"+i} ${this.transform[i]}>&nbsp;</text>`)
                           .join("");
        this.upper      = f.map( (_,i) => `<circle class="svg_click" cx="0" cy="0" r="150" ${this.transform[i]} id=${"upper_"+i}  onmouseover="this.style.stroke='red'" onmouseout="this.style.stroke='black'"/>`)
                           .join("");
    }
}

class GardenView_Circle extends GardenView {
    configure() {
        let f = G.foxes ; // to get a "foxes" long array, we don't actually use the data now

        // Radii
        this.R = [(150*2+100)*H.xlength/(2*Math.PI)];
        for ( let y = 1 ; y < H.ylength ; ++y ) {
            this.R[y]=this.R[y-1]+350;
        } 
        this.total_radius = this.R[H.ylength-1]+200 ; // For inner circle radius plus layers, plus boundary

        this.vb = { // svg viewBox dimensions
            x: -this.total_radius,
            y: -this.total_radius,
            width: 2*this.total_radius,
            height: 2*this.total_radius,
        };
        this.background = `<circle cx="0" cy="0" r="${this.total_radius-200}" class="svg_boundary" />`;

        // Foxholes lower (has background) symbol (holds inhabitant) upper (for click and border)
        this.lower      = f.map( (_,i) => { let [l,h]=Game.split(i,H.xlength); return `<circle class="svg_hole" cx="0" cy="-${this.R[h]}" r="150" transform="rotate(${360*l/H.xlength})" />`;}).join("");
        this.symbol     = f.map( (_,i) => { let [l,h]=Game.split(i,H.xlength); return `<text class="svg_symbol" x="0" y="-${this.R[h]-60}" id=${"symbol_"+i} transform="rotate(${360*l/H.xlength})" />&nbsp;</text>`;}).join("");
        this.upper      = f.map( (_,i) => { let [l,h]=Game.split(i,H.xlength); return `<circle class="svg_click" cx="0" cy="-${this.R[h]}" r="150" id=${"upper_"+i} transform="rotate(${360*l/H.xlength})" onmouseover="this.style.stroke='red'" onmouseout="this.style.stroke='black'"/>`;}).join("");
    }
}

class GardenView_OffsetCircle extends GardenView {
    configure() {
        let f = G.foxes ; // to get a "foxes" long array, we don't actually use the data now

        // Radii
        this.R = [(150*2+100)*H.xlength/(2*Math.PI)];
        for ( let y = 1 ; y < H.ylength ; ++y ) {
            this.R[y]=150+((this.R[y-1]+50)/Math.cos(Math.PI/H.xlength));
        } 
        this.total_radius = this.R[H.ylength-1]+200 ; // For inner circle radius plus layers, plus boundary

        this.vb = { // svg viewBox dimensions
            x: -this.total_radius,
            y: -this.total_radius,
            width: 2*this.total_radius,
            height: 2*this.total_radius,
        };
        this.background = `<circle cx="0" cy="0" r="${this.R[H.ylength-1]}" class="svg_boundary" />`;

        // Foxholes lower (has background) symbol (holds inhabitant) upper (for click and border)
        this.lower      = f.map( (_,i) => { let [l,h]=Game.split(i,H.xlength); return `<circle class="svg_hole" cx="0" cy="-${this.R[h]}" r="150" transform="rotate(${360*(l+.5*(h&1))/H.xlength})"/>`;}).join("");
        this.symbol     = f.map( (_,i) => { let [l,h]=Game.split(i,H.xlength); return `<text class="svg_symbol" x="0" y="-${this.R[h]-60}" id=${"symbol_"+i} transform="rotate(${360*(l+.5*(h&1))/H.xlength})"/>&nbsp;</text>`;}).join("");
        this.upper      = f.map( (_,i) => { let [l,h]=Game.split(i,H.xlength); return `<circle class="svg_click" cx="0" cy="-${this.R[h]}" r="150" id=${"upper_"+i} transform="rotate(${360*(l+.5*(h&1))/H.xlength})" onmouseover="this.style.stroke='red'" onmouseout="this.style.stroke='black'"/>`;}).join("");
    }
}

class GardenView_Grid extends GardenView {
    configure() {
        let f = G.foxes ;
        this.vb = { // svg viewBox dimensions
            x: -200,
            y: -250,
            width: 350*(H.xlength-1)+400,
            height: 350*H.ylength+400,
        };
        this.background = `<rect class="svg_boundary" x="0" y="0" width="${350*(H.xlength-1)}" height="${350*(H.ylength-1)}"/>`;
        this.transform  = f.map( (_,i) => { let [l,h]=Game.split(i,H.xlength); return `transform="translate(${l*350},${h*350})"`} ) ;

        // Foxholes lower (has background) symbol (holds inhabitant) upper (for click and border)
        this.lower      = f.map( (_,i) => `<circle class="svg_hole" cx="0" cy="0" r="150" ${this.transform[i]} />`)
                           .join("");
        this.symbol     = f.map( (_,i) => `<text class="svg_symbol" x="0" y="60" id=${"symbol_"+i} ${this.transform[i]} >&nbsp;</text>`)
                           .join("");
        this.upper      = f.map( (_,i) => `<circle class="svg_click" cx="0" cy="0" r="150" ${this.transform[i]} id=${"upper_"+i}  onmouseover="this.style.stroke='red'" onmouseout="this.style.stroke='black'"/>`)
                           .join("");
    }
}

class GardenView_OffsetGrid extends GardenView {
    configure() {
        let f = G.foxes ;
        this.vb = { // svg viewBox dimensions
            x: -200,
            y: -250,
            width: 350*(H.xlength-1)+575,
            height: 303*H.ylength+400,
        };
        this.background = `<rect class="svg_boundary" x="0" y="0" width="${350*(H.xlength-1)+(H.real_offset?175:0)}" height="${303*(H.ylength-1)}"/>`;
        this.transform  = f.map( (_,i) => { let [l,h]=Game.split(i,H.xlength); return `transform="translate(${l*350+(h&1)*175},${h*303})"`} ) ;

        // Foxholes lower (has background) symbol (holds inhabitant) upper (for click and border)
        this.lower      = f.map( (_,i) => `<circle class="svg_hole" cx="0" cy="0" r="150" ${this.transform[i]}/>`)
                           .join("");
        this.symbol     = f.map( (_,i) => `<text class="svg_symbol" x="0" y="60" id=${"symbol_"+i} ${this.transform[i]}>&nbsp;</text>`)
                           .join("");
        this.upper      = f.map( (_,i) => `<circle class="svg_click" cx="0" cy="0" r="150" ${this.transform[i]} id=${"upper_"+i}  onmouseover="this.style.stroke='red'" onmouseout="this.style.stroke='black'"/>`)
                           .join("");
    }
}

class TableView {
    constructor() {
        this.table = document.querySelector("table") ;
        this.thead = this.table.querySelector("thead") ;
        this.tbody = this.table.querySelector("tbody") ;
        this.stats = false;
    }

    stats_row() {
        let r = document.createElement("tr");
        let h = document.createElement("th");
        h.innerText = "Probability" ;
        r.appendChild(h) ;
        for ( let i = 1 ; i <= H.total ; ++i ) {
            h = document.createElement("th");
            r.appendChild(h) ;
        }
        this.thead.insertBefore(r,this.thead.firstElementChild);
    }

    statchange() {
        let s = this.stats ;
        this.stats = document.getElementById("stats").checked ;
        if (s == this.stats ) {
        } else if ( this.stats ) {
            this.stats_row() ;
            this.update() ;
        } else {
            this.thead.removeChild(this.thead.firstElementChild);
        }
    }

    start() {
        this.header();
        GV.start();
        this.tbody.innerHTML = "";
        this.control_row();
        this.update();
    }
    
    click(hole) {
        [...this.tbody.lastElementChild
            .querySelectorAll("input")]
            .filter( i=>parseInt(i.getAttribute("data-n"))==hole )[0].click();
    }

    check() {
        let h = [...this.tbody.lastElementChild.querySelectorAll("input")]
            .filter( c=>c.checked )
            .map(c=>parseInt(c.getAttribute("data-n")));
        if ( h.length == H.visits ) {
            this.move(h) ;
        }
    }

    checked(hole) {
        let inp = [...this.tbody.lastElementChild.querySelectorAll("input")] ;
        if ( inp.length == 0 ) {
            return false ;
        }
        return inp.filter( c=>parseInt(c.getAttribute("data-n"))==hole )[0].checked ;
    }

    control_row() {
        let r = document.createElement("tr");
        let s = this.symbols( G.history(G.day) );
        for ( let i = 0; i <= H.total ; ++i ) {
            let d = document.createElement("td");
            if ( i==0 ) {
                d.innerHTML = `Day ${G.day}`;
            } else if ( G.number == 0 ) {
                d.innerHTML = s[i-1];
            } else {
                d.innerHTML = s[i-1] + "<br>" ;
                let b = document.createElement("input");
                b.type = "checkbox";
                b.onclick = () => TV.check() ;
                b.setAttribute("data-n",i-1);
                d.appendChild(b);
            }
            r.appendChild(d);
        }
        this.tbody.appendChild(r);
        GV.control_row(s);
    }

    back() {
        if ( G.day < 2 ) {
            this.start() ;
        } else {
            this.remove_row();
            this.remove_row();
            G.back();
            this.control_row();
        }
        this.update();
    }

    update() {
        document.getElementById("raided").value=G.day*H.visits;
        if ( this.stats ) {
            let p = this.thead.firstElementChild.childNodes;
            G.stats.forEach( (v,i) => p[i+1].innerText = v.toFixed(3) );
        }
    }
        

    move(holes) { // hole 0-based
        G.move(holes);
        this.remove_row();
        this.add_history_row();
        this.control_row();
        this.update();
    }

    symbols( obMove ) {
        // moves = list of inspection holes
        // poisons = list of poisoned holes
        // foxes = true/false fox occupation list
        // returns a symbol list
        if ( G.number == 0 && obMove.moves.length==0 ) {
            // victory
            return obMove.foxes.map( (_,i) => i&1 ? "&#128077;" : "&#128516;" ) ;
        } else {
            let s = obMove.foxes.map( f => f?"&#129418;":"&nbsp;" ) ;
            obMove.moves.forEach( m => s[m] = "&#128064;" );
            obMove.poisoned.forEach( p => s[p] = "&#9763;" );
            return s ;
        }
    } 

    add_history_row() { // historical row
        let prior = G.prior ;
        let r = document.createElement("tr");
        let s = this.symbols( prior );
        for ( let i = 0; i <= H.total ; ++i ) {
            let d = document.createElement("td");
            if ( i==0 ) {
                d.innerHTML = `Day ${G.day-1}`;
            } else {
                d.innerHTML = s[i-1] ;
            }
            r.appendChild(d);
        }
        this.tbody.appendChild(r);
    }

    remove_row() {
        this.tbody.removeChild( this.tbody.lastChild ) ;
    }

    header() {
        this.thead.innerHTML = "";
        let r = document.createElement("tr");
        let h = document.createElement("th");
        h.innerText = "Day" ;
        r.appendChild(h) ;
        for ( let i = 1 ; i <= H.total ; ++i ) {
            h = document.createElement("th");
            h.innerText = i + "" ;
            r.appendChild(h) ;
        }
        this.thead.appendChild(r) ;
    }
}

class Game {
	constructor() {
        this.fox_moves = [] ;
	}
	
    poison_list(date) { // returns just the elements as an array
        return this.poison_array(date).map( (p,i) => p?i:-1 ).filter( i => i>-1 ) ;
    }

    poison_array(date=this.date) { // returns true/false array
        let p = Array(H.total).fill(false);
        if ( H.poison_days > 0 ) {
            this.inspections.slice(0,date).slice(-H.poison_days).forEach( d => d.forEach( i => p[i]=true ) ) ;
        }
        return p ; 
    }

    move( inspect ) { // holes is an array
        // inspections are 0-based
        this.inspections[this.date] = inspect ;
        this.date += 1;

        // use previous fox locations
        let old_locations = this.fox_history[this.date-1].slice() ;
        let old_stats = this.stats_history[this.date-1].slice() ;

        // exclude inspected hole
        inspect.forEach( h => {
            old_locations[h] = false ;
            old_stats[h] = 0. ;
            });

        let current_fox = Array(H.total).fill(false) ;
        let current_stats = Array(H.total).fill(0) ;

        let plist = this.poison_array() ;
        
         plist.forEach( (p,h) => {
            if ( !p ) {
                let esc = this.fox_moves[h] ; // all moves
                let e = esc.filter( ee=> !plist[ee] ) ; // exclude poisoned
                e.forEach( ee => current_fox[h] ||= old_locations[ee] );
                e.forEach( ee => current_stats[h] += old_stats[ee]/esc.length );
            }
            });

        // store
        this.fox_history[this.date] = current_fox;
        this.stats_history[this.date] = current_stats;
    }

    start () {
        this.inspections = [];
        this.date = 0;
        let current_fox = Array(H.total).fill(true);
        let current_stats = Array(H.total).fill( 1. / H.xlength );
        this.fox_history = [current_fox] ;
        this.stats_history = [current_stats];
        this.inspections = [] ;
        TV.start() ;
    }

    get foxes() {
        return this.fox_history[this.date] ;
    }

    get stats() {
        return this.stats_history[this.date] ;
    }

    history( date ) {
        let r = {
            moves: [],
            poisoned: [],
            foxes: Array(H.total).fill(true),
        };
        if ( date>=0 && date<=this.date) {
            r.moves = this.inspections[date]||[];
            r.poisoned = this.poison_list(date);
            r.foxes = this.fox_history[date];
        }
        return r;
    }

    get prior() {
        return this.history(this.date-1);
    }

    back() { // backup a move
        this.date -= 1 ;
    }

    get number() { // of foxes left
        return this.fox_history[this.date].filter(f=>f).length ;
    }

    get day() {
        return this.date;
    }

    static mod( i, m ) { // modulo rather than remainder
        let r = i % m ;
        while ( r < 0 ) {
            r += Math.abs(m) ;
        }
        return r ;
    }

    static wrap( i , m ) {
        let j = Game.mod(i,m) ;
        while ( j > m ) {
            j -= Math.abs(m);
        }
        return j;
    }

    static wrap_neighbors( i , m ) {
        return [ Game.wrap(i+1,m), Game.wrap(i-1,m) ];
    }

    static limit( ar, m ) { // array ar
        return ar.filter( a => a>=0 && a<m );
    }

    static limit_neighbors( i , m ) {
        return Game.limit([i-1,i+1],m);
    }

    static split( i, m ) { //return indexes low to high
        let low = Game.mod(i,m);
        return [ low, Math.round((i-low)/m) ];
    }

    static combine( lo, hi, m ) {
        return hi * m + lo;
    }

    static tricombine( lo, hi ) {
        return this.trirows[hi]+lo-hi ;
    }

    static triset() {
        this.trirows=[0] ;
        for ( let h=1 ; h<H.xlength ; h++ ) {
            this.trirows[h] = h+1+this.trirows[h-1] ;
        }
    }

    static trisplit( i ) { //return low to high
        for ( let h=0 ; h<H.xlength ; h++ ) {
            if ( i <= this.trirows[h] ) {
                return [ i+h-this.trirows[h], h ] ;
            }
        }
    }
        
}

class Game_Triangle extends Game {
   constructor() {
        super() ;
        TV = new TableView() ;
        GV = new GardenView_Triangle() ;

        Game.triset() ; // set up row ends
        for ( let holes = 0 ; holes<H.total ; ++holes ) {
			let [ lo,hi ] = Game.trisplit( holes ) ;
			this.fox_moves.push(
				Game.limit_neighbors(lo,hi+1)
					.map(l=>[l,hi])
					.concat( Game.limit_neighbors(hi,H.xlength).map(h=>[lo,h]).filter(([ll,hh])=> ll<=hh) )
					.map( ([ll,hh])=> Game.tricombine( ll, hh ) )
				) ;
		}
    }
}

class Game_OffsetTriangle extends Game {
   constructor() {
        super() ;
        TV = new TableView() ;
        GV = new GardenView_OffsetTriangle() ;

        Game.triset() ; // set up row ends
        for ( let holes = 0 ; holes<H.total ; ++holes ) {
			let [ lo,hi ] = Game.trisplit( holes ) ;
			let r = Game.limit_neighbors( lo, hi+1 ).map( l=>[l,hi] ) ; // horizontal
			Game.limit_neighbors( hi, H.xlength ) //vertical
				.forEach( h => Game.limit( [lo,lo+(h<hi?-1:1)], H.xlength ).map(l=>[l,h]).filter(([ll,hh])=>ll<=hh).forEach( lh => r.push( lh ) )
				);
			this.fox_moves.push( r.map( ([ll,hh])=> Game.tricombine( ll, hh )) );
		}
    }
}

class Game_Circle extends Game {
   constructor() {
        super() ;
        TV = new TableView() ;
        GV = new GardenView_Circle() ;

		for ( let holes = 0 ; holes<H.total ; ++holes ) {
			let [ lo,hi ] = Game.split( holes, H.xlength ) ;
			this.fox_moves.push( Game.wrap_neighbors(lo,H.xlength).map(l=>[l,hi])
				.concat( Game.limit_neighbors(hi,H.ylength).map(h=>[lo,h]) )
				.map( ([ll,hh])=> Game.combine( ll, hh, H.xlength ) )
				);
		}
    }
}

class Game_OffsetCircle extends Game {
   constructor() {
        super() ;
        TV = new TableView() ;
        GV = new GardenView_OffsetCircle() ;

		for ( let holes = 0 ; holes<H.total ; holes++ ) {
			let [ lo,hi ] = Game.split( holes, H.xlength ) ;
			let r = Game.wrap_neighbors( lo, H.xlength ).map( l=>[l,hi] ) ; // horizontal
			Game.limit_neighbors( hi, H.ylength ) //vertical
				.forEach( h => [lo-(h&1),lo+1-(h&1)].forEach( l=>r.push( [Game.wrap( l, H.xlength ),h]))
				);
				console.log(this.fox_moves);
			this.fox_moves.push( r.map( ([ll,hh])=> Game.combine( ll, hh, H.xlength )) ) ;
		}
    }
}

class Game_Grid extends Game {
   constructor() {
        super() ;
        TV = new TableView() ;
        GV = new GardenView_Grid() ;
        
        for ( let holes = 0 ; holes<H.total ; ++holes ) {
			let [ lo,hi ] = Game.split( holes, H.xlength ) ;
			this.fox_moves.push(
				Game.limit_neighbors(lo,H.xlength)
					.map(l=>[l,hi])
					.concat( Game.limit_neighbors(hi,H.ylength).map(h=>[lo,h]) )
					.map( ([l,h])=> Game.combine( l, h, H.xlength) )
				) ;
		}
    }
}

class Game_OffsetGrid extends Game {
   constructor() {
        super() ;
        TV = new TableView() ;
        GV = new GardenView_OffsetGrid() ;

        for ( let holes = 0 ; holes<H.total ; ++holes ) {
			let [ lo,hi ] = Game.split( holes, H.xlength ) ;
			let r = Game.limit_neighbors( lo, H.xlength ).map( l=>[l,hi] ) ; // horizontal
			Game.limit_neighbors( hi, H.ylength ) //vertical
				.forEach( h => Game.limit( [lo-(h&1),lo+1-(h&1)], H.xlength ).forEach( l => r.push( [l,h] ) )
				);
			this.fox_moves.push( r.map( ([l,h])=> Game.combine( l, h, H.xlength )) );
		}
    }
}

class Cookie { //convenience class
    static set( cname, value ) {
      // From https://www.tabnine.com/academy/javascript/how-to-set-cookies-javascript/
        let date = new Date();
        date.setTime(date.getTime() + (400 * 24 * 60 * 60 * 1000)); // > 1year
        document.cookie = `${cname}=${encodeURIComponent(JSON.stringify(value))}; expires=${date.toUTCString()}; SameSite=None; Secure; path=/`;
    }

    static get( cname ) {
        const name = `${cname}=`;
        let ret = null;
        decodeURIComponent(document.cookie).split('; ').filter( val => val.indexOf(name) === 0 ).forEach( val => {
            try {
                ret = JSON.parse( val.substring(name.length) );
                }
            catch(err) {
                ret =  val.substring(name.length);
                }
        });
        //console.log("Cookie get",cname, ret );
        return ret;
    }

}

class Overlay {
    constructor () {
        // Parameters  -- standard game first
        this.classic() ;
        H.cookies() ;
        H.validate();
        this.fillin();
        this.is_garden = true; //default
        this.view = null ; // what mode is currently shown?
    }

    classic() {
        // Parameters  -- standard game first
        H.geometry = "grid";
        H.visits = 1;
        H.poison_days = 0;
        H.xlength = 5;
        H.ylength = 1;
        H.offset = false;
    }

    circle () {
        H.geometry = "circle";
        H.visits = 2;
        H.poison_days = 0;
        H.xlength = 5;
        H.ylength = 1;
        H.offset = false;
    }

    poison() {
        H.geometry = "circle";
        H.visits = 1;
        H.poison_days = 1;
        H.xlength = 5;
        H.ylength = 1;
        H.offset = false;
    }

    grid() {
        H.geometry = "grid";
        H.visits = 3;
        H.poison_days = 0;
        H.xlength = 5;
        H.ylength = 2;
    }

    custom() {
        H.geometry = document.querySelector('input[name="arrange"]:checked').value;
        H.xlength = document.getElementById('length').value;
        H.ylength = document.getElementById('width').value;
        H.visits = document.getElementById("holesper").value ;
        H.poison_days = document.getElementById("poisoneddays").value
        H.offset = document.getElementById("offset").checked;
        H.validate(); // check values
    }

    fillin() { // updates rule and choose to match current game settings
        // length
        document.getElementById("rlength").value = H.xlength;
        document.getElementById("length").value = H.xlength;
        Cookie.set("length",H.xlength);

        // width
        document.getElementById("rwidth").value = H.ylength;
        document.getElementById("width").value = H.ylength;
        Cookie.set("width",H.ylength);

        // visits
        document.getElementById("rholesper").value = H.visits;
        document.getElementById("holesper").value = H.visits;
        Cookie.set("visits", H.visits );

        // offset
        document.getElementById("offset").checked = H.offset;
        Cookie.set("offset", H.offset );


        // geometry
        switch (H.geometry) {
            case "triangle":
                document.getElementById("rarrange").innerHTML = `The ${H.xlength} foxholes are arranged in a ${H.real_offset?" offset":""} triangle.`;
                break;
            case "circle":
                document.getElementById("rarrange").innerHTML = `The ${H.xlength} foxholes are arranged in a${H.ylength>1?" thicker":""} ${H.real_offset?" offset":""} circle.`;
                break;
            case "grid":
            default:
                document.getElementById("rarrange").innerHTML = `The ${H.xlength} fox holes are arranged in a${H.ylength>1?" thicker":""} ${H.real_offset?" offset":""} line. The fox cannot move past the edges.`;
                break;
            }
        document.querySelectorAll('input[name="arrange"]').forEach( a => a.checked=(a.value==H.geometry) );
        Cookie.set("geometry", H.geometry );

        // poison
        if ( H.poison_days==0 ) {
            document.getElementById("rpoison").innerHTML = `Organic! No poisoning. The fox can move back in that very night after your daytime inspection.`;
        } else {
            document.getElementById("rpoison").innerHTML = `You are a poisoner! The hole is uninhabitable for ${H.poison_days} day(s) after your inspection.`;
        }
        document.getElementById("poisoneddays").value = H.poison_days;
        Cookie.set("poison_days", H.poison_days );
    }

    select(game_type) {
        switch( game_type) {
            case "classic":
                this.classic();
                break ;
            case "circle":
                this.circle();
                break;
            case "poison":
                this.poison();
                break;
            case "custom":
                this.custom();
                break;
            case "double":
                this.grid();
                break;
            default:
        }
        // fill in fields
        this.fillin(); // update displays
        this.newgame();
    }
        
    hide() {
        ["svg_view","Ttable","choose","rules","file","BB_table","BB_garden","BB_layout","BB_rules","BB_choose","BB_history","BB_file"].forEach( d => document.getElementById(d).style.display="none" );
    }

    layout() {
        this.view = "layout" ;
        this.hide() ;
        document.getElementById("svg_view").style.display="block";
        document.getElementById("BB_layout").style.display="inline-flex";
        GV.layout();
    }

    history() {
        this.view = "history" ;
        this.hide() ;
        document.getElementById("svg_view").style.display="block";
        document.getElementById("BB_history").style.display="inline-flex";
        GV.history();
    }

    choose() {
        this.view = "choose" ;
        this.hide() ;
        document.getElementById("choose").style.display="block";
        document.getElementById("BB_choose").style.display="inline-flex";
    }

    file() {
        this.view = "file" ;
        this.hide() ;
        // clear upload status
        document.getElementById("loadstatus").innerText="";
        // create link
        let u = new URL( location.href ) ;
        u.search = new URLSearchParams( Drag.ObjCreate() ).toString() ;
        document.getElementById("gamelink").href = u ;
        document.getElementById("file").style.display="block";
        document.getElementById("BB_file").style.display="inline-flex";
    }

    rules() {
        this.view = "rules" ;
        this.hide() ;
        document.getElementById("rules").style.display="block";
        document.getElementById("BB_rules").style.display="inline-flex";
    }

    resume() {
        this.view = "game" ;
        this.garden( this.is_garden ) ;
    }

    newgame() {
        this.view = "game" ;
        switch( H.geometry ) {
            case "triangle":
                G = H.offset? new Game_OffsetTriangle() : new Game_Triangle() ;
                break ;
            case "circle":
                G = H.offset? new Game_OffsetCircle() : new Game_Circle() ;
                break ;
            case "grid":
            default:
                G = H.offset ? new Game_OffsetGrid() : new Game_Grid() ;
                break ;
            }
        H.status();
        this.garden(this.is_garden)
        G.start();
    }

    garden( is_garden ) {
        this.hide();
        this.is_garden = is_garden ;
        if ( is_garden ) {
            document.getElementById("svg_view").style.display="block";
            document.getElementById("BB_garden").style.display="inline-flex";
            document.getElementById("Bgarden1").style.backgroundColor = "white";
            document.getElementById("Bgarden2").style.backgroundColor = "white";
            document.getElementById("Btable1").style.backgroundColor = "grey";
            document.getElementById("Btable2").style.backgroundColor = "grey";
        } else {
            document.getElementById("Ttable").style.display="block";
            document.getElementById("BB_table").style.display="inline-flex";
            document.getElementById("Bgarden1").style.backgroundColor = "grey";
            document.getElementById("Bgarden2").style.backgroundColor = "grey";
            document.getElementById("Btable1").style.backgroundColor = "white";
            document.getElementById("Btable2").style.backgroundColor = "white";
        }
    }
}
O = new Overlay();

class Drag {
    // Modified from https://www.amitmerchant.com/drag-and-drop-files-native-javascript/
    static ignore(e) {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }
    
    static drop(e) {
        const files = e.dataTransfer.files;
        const dT = new DataTransfer();
        
        const reader = new FileReader();
        reader.onload= () => Drag.Jparse(reader.result) ;
        
        reader.readAsText( e.dataTransfer.files[0] ) ;

        e.preventDefault();
    }
    
    static Jparse(j) {
        let obj = null ;
        try {
            obj = JSON.parse(j) ;
        }
        catch {
            console.error("Invalid Json file");
            document.getElementById("loadstatus").innerText="Invalid JSON file";
            return ;
        }
        this.validate( obj ) ;
    }
    
    static validate( obj ) {
        document.getElementById("loadstatus").innerText="Checking...";
        let changed = false ;
        [ ['length','xlength'], ['width','ylength'], 'visits', 'poison_days', 'offset', 'geometry' ]
        .forEach( (I) => {
            let k = I;
            let h = I;
            if ( Array.isArray(I) ) {
                k = I[0] ;
                h = I[1] ;
            }
            if ( k in obj ) {
                changed = true ;
                H[h] = obj[k] ;
            }
        });
        if ( changed ) {
            document.getElementById("loadstatus").innerText="Starting loaded game...";
            H.validate();
            O.newgame() ;
            if ( 'moves' in obj ) {
                let t = H.total ;
                if ( obj.moves.every( m => m.every( mm => (mm>=0) && (mm<t) ) ) ) { 
                    obj.moves.forEach( m => TV.move(m) ) ;
                }
            }
        }
        document.getElementById("loadstatus").innerText="No game settings in file";
    }
    
    static ObjCreate() {
        // creates an object with the state of the game
        let obj = {
            length: H.xlength,
            width: H.ylength,
            visits: H.visits,
            offset: H.offset,
            geometry: H.geometry,
            poison_days: H.poison_days,
        }
        if ( G.day > 0 ) {
            if ( G.number==0 ) {
                obj.solved = true;
            }
            obj.moves = G.inspections;
        }
        return obj ;
    }
    
    static download() {
        let csvFile = new Blob([JSON.stringify(Drag.ObjCreate())], {type: 'application/json'});
        let downloadLink = document.createElement("a");
        downloadLink.download = [H.geometry,H.xlength,H.ylength,H.visits,H.poison_days,"json"].join(".");
        downloadLink.href = window.URL.createObjectURL(csvFile);
        downloadLink.style.display = "none";

        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
    }

    static upload() {
        document.getElementById("loadstatus").innerText="";
        document.getElementById("upload").click();
    }
    
    static read(e) {
        const reader = new FileReader();
        reader.onload= () => Drag.Jparse(reader.result) ;
        
        reader.readAsText( document.getElementById("upload").files[0] ) ;
    }
    
    static URL() {
        // parses the initial URL
        let obj = {} ;
        let u = new URL(window.location.href ) ;
        u.searchParams.forEach( (v,k) => console.log(k,v,typeof(v)) ) ;
        u.searchParams.forEach( (v,k) => obj[k] = v ) ;
        if ( 'moves' in obj ) {
			// moves gets converted to a flat text list. -- need to reparse
			let flat = obj.moves.split(",");
			let arrays = [] ;
			while ( flat.length >= H.visits ) {
				arrays.push( [flat.slice(H.visits)] );
				flat = flat.slice(H.visits) ;
			}
			obj.moves = arrays
		}
        Drag.validate(obj);
    }
}

// Application starting point
window.onload = () => {
    // Initial splash screen

    // Stuff into history to block browser BACK button
    window.history.pushState({}, '');
    window.addEventListener('popstate', ()=>window.history.pushState({}, '') );

    // Service worker (to manage cache for off-line function)
    if ( 'serviceWorker' in navigator ) {
        navigator.serviceWorker
        .register('/sw.js')
        .catch( err => console.log(err) );
    }
    
    // For drag and drop
    let body = document.querySelector("body");
    body.addEventListener("dragenter", Drag.ignore, false);
    body.addEventListener("dragover", Drag.ignore, false);
    body.addEventListener("drop", Drag.drop, false);
    document.addEventListener("keydown", e =>GV.key(e) ) ; 

    O.newgame();
    Drag.URL();
};
