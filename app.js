/*=============================================================
  Filename: CanvasStack-2v01.js
  Rev: 2
  By: A.R.Collins
  Description: Utilities to create multiple transparent
  canvas layers suitable for animation.
  License: Released into the public domain
  latest version at
  <http://www/arc.id.au/CanvasLayers.html>

  Date   |Description                                      |By
  -------------------------------------------------------------
  30Oct09 Rev 1.00 First release                            ARC
  08Sep12 bugfix: test for emulator failed in IE9           ARC
  02Mar13 Re-write to use screen canvas as background       ARC
  28Jul13 remove getOverlayCanvas (use getElementById)
          Tidy for JSLint                                   ARC
  20Jul14 Setup a resize handler for layers, required when
          canvas size changes on window resize (width in %).
          Dropped excanvas support                          ARC
  18Sep19 Re-factor to simplify                             ARC
  21Sep19 Convert to Classes etc                            ARC
  30Sep19 Added addResizeCallback method                    
          Released as Rev 2v00                              ARC
  01Jan20 Add Layer.dragObjects to match Cango Layer        ARC 
  =============================================================*/

  var CanvasStack;

  (function()
  {
    "use strict";
  
    class Layer
    {
      constructor(canvasID, canvasElement)
      {
        this.id = canvasID;
        this.cElem = canvasElement;
        this.dragObjects = [];
      }
    }
  
    CanvasStack = class{
      constructor(cvsID, stackLimit){
        const savThis = this;
  
        function setResizeHandler(resizeLayers, timeout){
          let timer_id = undefined;
          window.addEventListener("resize", ()=>{
            if(timer_id != undefined) 
            {
              clearTimeout(timer_id);
              timer_id = undefined;
            }
            timer_id = setTimeout(()=>{
                timer_id = undefined;
                resizeLayers();
                savThis.bkgCanvas.resizeFns.forEach((currFn)=>currFn());
              }, timeout);
          });
        }
              
        function resizeLayers(){
          const t = savThis.bkgCanvas.offsetTop + savThis.bkgCanvas.clientTop,
                l = savThis.bkgCanvas.offsetLeft + savThis.bkgCanvas.clientLeft,
                w = savThis.bkgCanvas.offsetWidth,
                h = savThis.bkgCanvas.offsetHeight;
  
          // check if canvas size changed when window resized, allow some rounding error in layout calcs
          if ((Math.abs(w - savThis.rawWidth)/w < 0.01) && (Math.abs(h - savThis.rawHeight)/h < 0.01))
          {
            // canvas size didn't change so return
            return;
          }
          // canvas has been resized so resize all the overlay canvases
          for (let j=1; j<savThis.bkgCanvas.layers.length; j++)  // bkg is layer[0]
          {
            let ovl = savThis.bkgCanvas.layers[j].cElem;
            if (ovl)  // may have been deleted so empty slot
            {
              ovl.style.top = t+'px';
              ovl.style.left = l+'px';
              ovl.style.width = w+'px';
              ovl.style.height = h+'px';
              ovl.width = w;    // reset canvas attribute to pixel width
              ovl.height = h;  
            }
          }
        }
  
        // check if this is a context for an overlay
        if (cvsID.indexOf("_ovl_") !== -1)
        {
          console.error("CanvasStack: canvas must be a background canvas not an overlay");
          return {};
        }
        
        this.cId = cvsID;
        this.stackLimit = stackLimit || 6;
        this.bkgCanvas = document.getElementById(cvsID);
        this.rawWidth = this.bkgCanvas.offsetWidth;   
        this.rawHeight = this.bkgCanvas.offsetHeight;
        this.bkgCanvas.resizeFns = [];
  
        if (!this.bkgCanvas.hasOwnProperty('layers'))
        {
          // create an array to hold all the overlay canvases for this canvas
          this.bkgCanvas.layers = [];
          // make a Layer object for the bkgCanvas
          let bkgL = new Layer(this.cId, this.bkgCanvas);   // bkgCanvas is always layer[0]
          this.bkgCanvas.layers[0] = bkgL;
          // make sure the overlay canvases always match the bkgCanvas size
          setResizeHandler(resizeLayers, 250);
        }
        if (!this.bkgCanvas.hasOwnProperty('unique'))
        {
          this.bkgCanvas.unique = 0;
        }
      }
  
      createLayer(){
        const w = this.rawWidth,
              h = this.rawHeight,
              nLyrs = this.bkgCanvas.layers.length;  // bkg is layer 0 so at least 1
  
        // check background canvas is still there
        if (!(this.bkgCanvas && this.bkgCanvas.layers))
        {
          console.log("CanvasStack: missing background canvas");
          return;
        } 
        if (this.bkgCanvas.layers.length >= this.stackLimit)
        {
          console.error("CanvasStack: too many layers");
          return;
        }
        this.bkgCanvas.unique += 1;     // a private static variable
        const uniqueTag = this.bkgCanvas.unique.toString();
        const ovlId = this.cId+"_ovl_"+uniqueTag;
        const ovlHTML = "<canvas id='"+ovlId+"' style='position:absolute' width='"+w+"' height='"+h+"'></canvas>";
        const topCvs = this.bkgCanvas.layers[nLyrs-1].cElem; 
        topCvs.insertAdjacentHTML('afterend', ovlHTML);
        const newCvs = document.getElementById(ovlId);
        newCvs.style.backgroundColor = "transparent";
        newCvs.style.left = (this.bkgCanvas.offsetLeft+this.bkgCanvas.clientLeft)+'px';
        newCvs.style.top = (this.bkgCanvas.offsetTop+this.bkgCanvas.clientTop)+'px';
        // make it the same size as the background canvas
        newCvs.style.width = this.bkgCanvas.offsetWidth+'px';
        newCvs.style.height = this.bkgCanvas.offsetHeight+'px';
        let newL = new Layer(ovlId, newCvs);
        // save the ID in an array to facilitate removal
        this.bkgCanvas.layers.push(newL);
        
        return ovlId;    // return the new canvas id 
      }
  
      deleteLayer(ovlyId){
        // check background canvas is still there
        if (!(this.bkgCanvas && this.bkgCanvas.layers))
        {
          console.log("CanvasStack: missing background canvas");
          return;
        } 
        for (let i=1; i<this.bkgCanvas.layers.length; i++)
        {
          if (this.bkgCanvas.layers[i].id === ovlyId)
          {
            let ovlNode = this.bkgCanvas.layers[i].cElem;
            if (ovlNode)
            {
              ovlNode.parentNode.removeChild(ovlNode);
            }
            // now delete layers array element
            this.bkgCanvas.layers.splice(i,1);   // delete the Layer object
          }
        }
      }
  
      deleteAllLayers(){
        // check background canvas is still there
        if (!(this.bkgCanvas && this.bkgCanvas.layers))
        {
          console.log("CanvasStack: missing background canvas");
          return;
        } 
        for (let i=this.bkgCanvas.layers.length-1; i>0; i--)   // don't delete layers[0] its the bakg canavs
        {
          let ovlNode = this.bkgCanvas.layers[i].cElem;
          if (ovlNode)
          {
            let orphan = ovlNode.parentNode.removeChild(ovlNode);
            orphan = null;
          }
          // now delete layers array element
          this.bkgCanvas.layers.splice(i,1);
        }
        // clear any resize callbacks, the layers are gone
        this.bkgCanvas.resizeFns.length = 0;   // remove any added handlers, leave the basic
      }
  
      addResizeCallback(callbackFn){
        this.bkgCanvas.resizeFns.push(callbackFn);
      }
    };
  
  }());

var canvas=document.querySelector('#canvas-game')
canvas.width=window.innerWidth
canvas.height=window.innerHeight
// PLAYER CONTEXT
var ctx=canvas.getContext('2d')
var canvas_stack = new CanvasStack('canvas-game')

var layer0 = canvas_stack.createLayer()
var layer0_ctx = document.getElementById(layer0).getContext('2d')
var spaceShip = document.querySelector('#playerSpace')
// FRACTILES CONTEXT LAYER 1
var layer1 = canvas_stack.createLayer()
var layer1_ctx = document.getElementById(layer1).getContext('2d')
// ENEMIES CONTEXT LAYER 2
var layer2 = canvas_stack.createLayer()
var layer2_ctx = document.getElementById(layer2).getContext('2d')
var enemyShip = document.querySelector('#enemySpace')

var mouse = {
    x: 0,
    y: 0
}
window.addEventListener('mousemove',(e)=>{
   mouse.y = e.y
})

window.addEventListener('resize', ()=>{
  canvas.width=window.innerWidth
  canvas.height=window.innerHeight
  createEnemies()
})

// PLAYER
function Player(x,y){
    this.x=x
    this.y=y
    this.height = 170
    this.width = 180
    this.health = 3
    health.innerHTML = this.health

    this.draw_player = ()=>{
      layer0_ctx.drawImage(spaceShip,this.x,this.y)
    }

    this.update_player = ()=>{
// PREVENTION OF SPACESHIP OVERFLOWING -- PLAYER
        this.y = mouse.y-85
        if(this.y<0){
            this.y=0
        }
        if(this.y+this.height>canvas.height){
            this.y=canvas.height-170
        }

        this.draw_player()
    }
}
// PLAYER CREATION

var player
function createPlayer(){
    player=null
    var x= 0
    var y= canvas.height/2
    player= new Player(x,y)
}

// FRACTILES
function Fractals(x,y,dx){
  this.x=x
  this.y=y
  this.dx=dx

  this.draw_fractal = ()=>{
      layer1_ctx.beginPath()
      layer1_ctx.arc(this.x,this.y,5,Math.PI*2,false)
      layer1_ctx.fill()
      layer1_ctx.fillStyle='red'
      layer1_ctx.closePath()
  }
  this.update_fractal = ()=>{  
// PREVENTION OF BULLET OVERFLOWING - FRACTILES
      if(this.y<85){
        this.y=85
      }
      if(this.y>canvas.height-85){
          this.y=canvas.height-85
      }
      this.x+=this.dx
      this.draw_fractal()
  }
}

// DISPLAYING HEATH AND AMMO

const health=document.querySelector('.health')
const ammo=document.querySelector('.ammo')
// AMMO VARS 

var lostAmmo=0
var maxAmmo=50
var maxAmmoDisplay=maxAmmo
ammo.innerHTML = maxAmmoDisplay

// RELOADING

function realod(){
  lostAmmo=0
  maxAmmo=50
  maxAmmoDisplay=50
  ammo.innerHTML = maxAmmoDisplay
}

// FRACTILES CREATION (AMMUNITION)

var fractal=[]
window.addEventListener('click', ()=>{
  if(lostAmmo<maxAmmo)
  {
        var x= 180
        var y= mouse.y
        var dx= 4
        lostAmmo++
        maxAmmoDisplay--
        ammo.innerHTML = maxAmmoDisplay
        fractal.push(new Fractals(x,y,dx))
  }
  if(maxAmmoDisplay==0)
  {
    ammo.innerHTML = 'Realoding'
    setTimeout(realod,5000)
  }
})


// ENEMIES

var objectDestroyed= 0
function Enemies(x,y,dx,dy){
  this.x = x
  this.y = y
  this.dx = dx 
  this.dy = dy
  
  this.frequency = 3
  this.aplitude = 10
  this.draw_enemy=()=>{
    layer2_ctx.drawImage(enemyShip,this.x,this.y)
  }

  this.update_enemy=()=>{
    this.x-=this.dx
    this.dy++
    this.y+=Math.sin(this.dy/this.aplitude)*this.frequency
    this.draw_enemy()
  }
}

// ENEMY CREATION

var countToEnd=0
var gamesCount=5
var enemies=[]
function createEnemies(){
  if(countToEnd>gamesCount) return 
    for(let i=0;i<10;i++){
    var x= Math.random()*(2*canvas.width-canvas.width)+canvas.width
    var y= Math.random()*((canvas.height-85)-85)+85
    var dx = Math.random()*(6-1)+1
    var dy = Math.random()*10
    enemies.push(new Enemies(x,y,dx,dy))
    }
    countToEnd++
}

// CREATING INTERVAL

const creatingInterval = setInterval(createEnemies,15000)

// DISTANCE CALCULATOR 

function distance(x1,y1,x2,y2){
  const xDist=  x2-x1
  const yDist=  y2-y1
  return Math.sqrt(Math.pow(xDist,2)+ Math.pow(yDist,2))
}

// CALCULATING DISTANCE AND DESTROYING

function distanceCalculating(){
  for(let i =0;i<enemies.length;i++){
    for(let j =0;j<fractal.length;j++){
      if(distance(enemies[i].x,enemies[i].y,fractal[j].x,fractal[j].y)<40){
        enemies[i].dx=0
        enemies[i].dy=0
        enemies[i].y=-200
        fractal[j].dx=100000
        fractal[j].dx=-fractal[j].dx
        objectDestroyed++
      }
    }
  }
}

// WHEN OBJECT PASS THE X ADD TO DESTROYED

function passed(){
  for(let i =0;i<enemies.length;i++){
    if(enemies[i].x<50){
      enemies[i].dx=0
      enemies[i].dy=0
      enemies[i].x=500
      enemies[i].y=-200
      objectDestroyed++
      player.health--
      health.innerHTML = player.health
    }
  }
}

const endScreen = document.querySelector('.endScreen')
const typeWin = document.querySelector('.ending-type-win')
const typeLose = document.querySelector('.ending-type-lose')
function endGame(){
  if(player.health<1)
  {
    clearInterval(creatingInterval)
    for(let i =0;i<enemies.length;i++){
      enemies[i].dx=0
      enemies[i].y=-200
      endScreen.classList.add("active")
      typeLose.classList.add("active")
    }
  }
  if(countToEnd>gamesCount){
    for(let i =0;i<enemies.length;i++){
      enemies[i].dx=0
      enemies[i].y=-200
      endScreen.classList.add("active")
      typeWin.classList.add("active")
    }
  }
}

// ANIMATE

function animate(){
    layer0_ctx.clearRect(0,0,canvas.width,canvas.height)
    layer1_ctx.clearRect(0,0,canvas.width,canvas.height)
    layer2_ctx.clearRect(0,0,canvas.width,canvas.height)
    requestAnimationFrame(animate)
    for(let i=0;i<fractal.length;i++)
    {
      fractal[i].update_fractal()
    }
    for(let j=0;j<enemies.length;j++)
    {
      enemies[j].update_enemy()
    }
    player.update_player()
    distanceCalculating()
    passed()
    endGame()
}
createEnemies()
createPlayer()
animate()



