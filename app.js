const $=id=>document.getElementById(id);
const saved=JSON.parse(localStorage.getItem("nandoTapSave")||"{}");
let coins=Number(saved.coins)||0,energy=Number.isFinite(saved.energy)?saved.energy:500,level=Number(saved.level)||1,power=Number(saved.power)||1,cost=Number(saved.cost)||50;
const maxEnergy=500;
function save(){localStorage.setItem("nandoTapSave",JSON.stringify({coins,energy,level,power,cost}));}
function render(){$("coins").textContent=Math.floor(coins).toLocaleString("en-US");$("energy").textContent=energy;$("energy-bar").style.width=(energy/maxEnergy*100)+"%";$("level").textContent=level;$("upgrade-cost").textContent=cost.toLocaleString("en-US");}
function pop(){const el=document.createElement("span");el.className="pop";el.textContent="+"+power;el.style.left=(42+Math.random()*16)+"%";el.style.top="44%";$("tap").append(el);setTimeout(()=>el.remove(),700);}
$("tap").addEventListener("click",()=>{if(energy<=0)return;coins+=power;energy=Math.max(0,energy-1);pop();render();save();});
$("upgrade").addEventListener("click",()=>{if(coins<cost){$("upgrade").textContent="عملات غير كافية";setTimeout(render,900);return;}coins-=cost;power++;level=Math.floor((power-1)/3)+1;cost=Math.ceil(cost*1.65);render();save();});
setInterval(()=>{if(energy<maxEnergy){energy=Math.min(maxEnergy,energy+2);render();save();}},1000);
render();