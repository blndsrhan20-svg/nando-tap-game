const $=id=>document.getElementById(id);
const seedChats=[
{id:1,name:"فريق NANDO",initial:"N",color:"#356b83",group:true,unread:2,time:"23:40",preview:"أهلاً بالجميع!",messages:[{text:"أهلاً بالجميع!",mine:false,time:"23:40"}]},
{id:2,name:"أحمد",initial:"أ",color:"#72548c",unread:1,time:"22:18",preview:"شلونك؟",messages:[{text:"شلونك؟",mine:false,time:"22:18"}]},
{id:3,name:"سارة",initial:"س",color:"#9b654f",unread:0,time:"أمس",preview:"وصل الملف، شكراً",messages:[{text:"وصل الملف، شكراً",mine:false,time:"أمس"}]},
{id:4,name:"ملاحظاتي",initial:"✎",color:"#47745e",unread:0,time:"أمس",preview:"مساحة خاصة لحفظ أفكارك",messages:[]}
];
const STORE_KEY="nando_messenger_v1";
let saved={};try{saved=JSON.parse(localStorage.getItem(STORE_KEY)||"{}")||{}}catch{}
let chats=Array.isArray(saved.chats)?saved.chats:seedChats,active=null,filter="all";
function persist(){try{localStorage.setItem(STORE_KEY,JSON.stringify({chats}));}catch{alert("مساحة التخزين ممتلئة؛ تعذر حفظ التغييرات.");}}
function drawList(){
 const q=$("search").value.trim().toLowerCase();
 const list=chats.filter(c=>(filter==="all"||(filter==="unread"&&c.unread)||(filter==="groups"&&c.group))&&c.name.toLowerCase().includes(q));
 $("chatList").innerHTML=list.length?list.map(c=>`<div class="chat ${active===c.id?"selected":""}" data-id="${c.id}"><div class="avatar" style="background:${c.color}">${escapeHtml(c.initial)}</div><div class="chatinfo"><div class="chatline"><b>${escapeHtml(c.name)}</b><span class="time">${escapeHtml(c.time)}</span></div><div class="chatline"><span class="preview">${escapeHtml(c.preview)}</span>${c.unread?`<span class="badge">${c.unread}</span>`:""}</div></div></div>`).join(""):'<div class="empty">لا توجد محادثات</div>';
 $("chatList").querySelectorAll(".chat").forEach(el=>el.onclick=()=>openChat(+el.dataset.id));
}
function openChat(id){
 active=id;const c=chats.find(x=>x.id===id);if(!c)return;c.unread=0;
 $("welcome").classList.add("hidden");$("thread").classList.remove("hidden");document.querySelector(".app").classList.add("open-thread");
 $("headAvatar").textContent=c.initial;$("headAvatar").style.background=c.color;$("headName").textContent=c.name;$("headStatus").textContent=c.group?"مجموعة":"محادثة شخصية";
 drawMessages();drawList();persist();$("messageInput").focus();
}
function drawMessages(){
 const c=chats.find(x=>x.id===active);if(!c)return;
 $("messages").innerHTML='<div class="day">اليوم</div>'+c.messages.map(m=>`<div class="bubble ${m.mine?"mine":""}">${escapeHtml(m.text)}<time>${escapeHtml(m.time)}</time></div>`).join("");
 $("messages").scrollTop=$("messages").scrollHeight;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
function nowTime(){return new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"});}
$("sendForm").addEventListener("submit",e=>{
 e.preventDefault();const text=$("messageInput").value.trim();if(!text||active===null)return;
 const c=chats.find(x=>x.id===active),now=nowTime();c.messages.push({text,mine:true,time:now});c.preview=text;c.time=now;
 $("messageInput").value="";persist();drawMessages();drawList();
});
$("search").addEventListener("input",drawList);
document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x===b));drawList();});
$("backBtn").onclick=()=>document.querySelector(".app").classList.remove("open-thread");
$("newChat").onclick=()=>{
 const name=prompt("اسم المحادثة الجديدة:");if(!name?.trim())return;
 const id=Math.max(0,...chats.map(c=>c.id))+1;
 chats.unshift({id,name:name.trim(),initial:name.trim()[0],color:"#426b8d",unread:0,time:"الآن",preview:"محادثة جديدة",messages:[]});
 persist();drawList();openChat(id);
};
$("attachBtn").onclick=()=>$("fileInput").click();
$("fileInput").onchange=()=>{
 const f=$("fileInput").files[0];if(!f||active===null)return;
 const c=chats.find(x=>x.id===active),label="مرفق محلي: "+f.name,now=nowTime();
 c.messages.push({text:label,mine:true,time:now});c.preview="📎 "+f.name;c.time=now;
 $("fileInput").value="";persist();drawMessages();drawList();
};
$("menuBtn").onclick=()=>alert("NANDO Messenger — نسخة ويب تجريبية. المحادثات محفوظة على هذا الجهاز فقط.");
drawList();
if("serviceWorker" in navigator && location.protocol!=="file:"){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));}
