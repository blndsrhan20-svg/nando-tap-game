const $ = (id) => document.getElementById(id);
const API_BASE = (window.THUNDER_CONFIG?.apiUrl || "").replace(/\/$/, "");
const API_ROOT = API_BASE || window.location.origin;
let chats = [];
let active = null, filter = "all", mode = "login", remoteMode = false, token = sessionStorage.getItem("thunder_token"), currentUser = null, socket = null;

function applyTheme(theme) {
  const selected = theme === "light" || theme === "dark" ? theme : (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  document.documentElement.dataset.theme = selected;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", selected === "light" ? "#ffffff" : "#111827");
  const button = $("themeToggle");
  if (button) { button.textContent = selected === "light" ? "☾" : "☀"; button.setAttribute("aria-label", selected === "light" ? "تفعيل المظهر الداكن" : "تفعيل المظهر الفاتح"); }
}
applyTheme(localStorage.getItem("thunder_theme") || "system");
$("themeToggle")?.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("thunder_theme", next);
  applyTheme(next);
});

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function nowTime() { return new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"}); }
function persist() { /* Remote conversations are persisted by the API. */ }
function setConnection(text) { $("connectionLabel").textContent = text; }
async function api(path, options = {}) {
  const response = await fetch(API_ROOT + path, {
    ...options,
    headers: {"Content-Type":"application/json", ...(token ? {Authorization:"Bearer "+token} : {}), ...(options.headers || {})}
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "تعذر الاتصال بالخادم");
  return data;
}
function showAuth(show) {
  $("authScreen").classList.toggle("hidden", !show);
  $("app").classList.toggle("hidden", show);
}
function setAuthMode(nextMode) {
  mode = nextMode;
  document.querySelectorAll(".auth-tab").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  const registering = mode === "register";
  $("displayNameField").classList.toggle("hidden", !registering);
  $("emailField").classList.toggle("hidden", !registering);
  $("usernameField").classList.toggle("hidden", !registering);
  $("identityInput").classList.toggle("hidden", registering);
  $("identityInput").required = !registering;
  $("passwordInput").autocomplete = registering ? "new-password" : "current-password";
  $("authSubmit").textContent = registering ? "إنشاء الحساب" : "دخول";
  $("authError").textContent = "";
}
document.querySelectorAll(".auth-tab").forEach(b => b.addEventListener("click", () => setAuthMode(b.dataset.mode)));

function connectSocket() {
  if (!window.io || !token) return;
  if (socket) socket.disconnect();
  socket = window.io(API_ROOT, {auth:{token}, transports:["websocket","polling"]});
  socket.on("connect_error", () => setConnection("الاتصال المباشر منقطع"));
  socket.on("connect", () => setConnection("متصل"));
  socket.on("typing:update", event => {
    if (event.conversationId !== active || event.userId === currentUser?.id) return;
    $("headStatus").textContent = event.active ? (event.displayName + " يكتب الآن…") : (chats.find(c=>c.id===active)?.group ? "مجموعة" : "محادثة شخصية");
  });
  socket.on("message:new", message => {
    const chat = chats.find(c => c.id === message.conversation_id);
    if (!chat) { loadConversations(); return; }
    if (!chat.messages.some(m => m.id === message.id)) chat.messages.push(toClientMessage(message));
    chat.preview = message.body;
    chat.time = new Date(message.created_at).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"});
    if (active === chat.id) {
      drawMessages();
      api(`/api/conversations/${encodeURIComponent(chat.id)}/read`,{method:"POST"}).catch(()=>{});
    } else chat.unread = (chat.unread || 0) + 1;
    drawList();
  });
}
function toClientMessage(m) {
  return {id:m.id,text:m.body,mine:m.sender_id === currentUser?.id,time:new Date(m.created_at).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"})};
}
function mapConversation(c) {
  const members = c.members || [];
  const other = members.find(m => m.id !== currentUser?.id);
  const isGroup = c.type === "group";
  const name = isGroup ? (c.title || "مجموعة") : (other?.displayName || other?.username || "محادثة");
  const last = c.last_message;
  return {
    id:c.id,name,initial:name.slice(0,1),color:isGroup?"#356b83":"#72548c",group:isGroup,
    time:last ? new Date(last.created_at).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"}) : "",
    preview:last?.body || "ابدأ المحادثة",unread:Number(c.unread_count)||0,messages:[]
  };
}
async function loadConversations() {
  const data = await api("/api/conversations");
  chats = data.conversations.map(mapConversation);
  drawList();
}
async function bootRemote() {
  try {
    await api("/health");
    remoteMode = true;
    setConnection("متصل بالخادم");
    if (!token) { showAuth(true); return; }
    try {
      const data = await api("/api/auth/me");
      currentUser = data.user;
      showAuth(false);
      connectSocket();
      await loadConversations();
    } catch {
      token = null; sessionStorage.removeItem("thunder_token"); showAuth(true);
    }
  } catch {
    remoteMode = false;
    chats = [];
    showAuth(true);
    setAuthMode("login");
    setConnection("غير متصل — جارٍ إعادة المحاولة");
    $("authError").textContent = "تعذر الاتصال بخادم THUNDER. حدّث الصفحة بعد قليل؛ لن نعرض محادثات وهمية أو نحفظ رسائلك محلياً.";
    drawList();
  }
}
$("authForm").addEventListener("submit", async event => {
  event.preventDefault();
  $("authError").textContent = "";
  try {
    let payload, endpoint;
    if (mode === "register") {
      payload = {
        username:$("usernameInput").value.trim().toLowerCase(),
        displayName:$("displayNameInput").value.trim(),
        email:$("emailInput").value.trim(),
        password:$("passwordInput").value
      };
      endpoint = "/api/auth/register";
    } else {
      payload = {identity:$("identityInput").value.trim(),password:$("passwordInput").value};
      endpoint = "/api/auth/login";
    }
    const result = await api(endpoint,{method:"POST",body:JSON.stringify(payload)});
    token = result.token; currentUser = result.user;
    sessionStorage.setItem("thunder_token",token);
    $("authForm").reset();
    showAuth(false); connectSocket(); await loadConversations();
  } catch (error) { $("authError").textContent = error.message; }
});

function drawList() {
  const q = $("search").value.trim().toLowerCase();
  const list = chats.filter(c => (filter==="all" || (filter==="unread"&&c.unread) || (filter==="groups"&&c.group) || (filter==="personal"&&!c.group) || (filter==="channels"&&c.channel)) && c.name.toLowerCase().includes(q));
  $("chatList").innerHTML = list.length ? list.map(c =>
    `<div class="chat ${active===c.id?"selected":""}" data-id="${escapeHtml(c.id)}"><div class="avatar" style="background:${c.color}">${escapeHtml(c.initial)}</div><div class="chatinfo"><div class="chatline"><b>${escapeHtml(c.name)}</b><span class="time">${escapeHtml(c.time)}</span></div><div class="chatline"><span class="preview">${escapeHtml(c.preview)}</span>${c.unread?`<span class="badge">${c.unread}</span>`:""}</div></div></div>`
  ).join("") : '<div class="empty">لا توجد محادثات</div>';
  $("chatList").querySelectorAll(".chat").forEach(el => el.onclick = () => openChat(el.dataset.id));
}
async function openChat(id) {
  active = id;
  const c = chats.find(x => String(x.id) === String(id));
  if (!c) return;
  c.unread = 0;
  $("welcome").classList.add("hidden"); $("thread").classList.remove("hidden");
  document.querySelector(".app").classList.add("open-thread");
  $("headAvatar").textContent = c.initial; $("headAvatar").style.background = c.color;
  $("headName").textContent = c.name; $("headStatus").textContent = c.group ? "مجموعة" : "محادثة شخصية";
  if (remoteMode) {
    try {
      const result = await api(`/api/conversations/${encodeURIComponent(id)}/messages?limit=60`);
      c.messages = result.messages.map(toClientMessage);
      socket?.emit("conversation:join",id);
      await api(`/api/conversations/${encodeURIComponent(id)}/read`,{method:"POST"});
    } catch (error) { setConnection(error.message); }
  }
  drawMessages(); drawList(); persist(); $("messageInput").focus();
}
function drawMessages() {
  const c = chats.find(x => String(x.id) === String(active));
  if (!c) return;
  $("messages").innerHTML = '<div class="day">اليوم</div>' + c.messages.map(m =>
    `<div class="bubble ${m.mine?"mine":""}">${escapeHtml(m.text)}<time>${escapeHtml(m.time)}</time></div>`
  ).join("");
  $("messages").scrollTop = $("messages").scrollHeight;
}
$("sendForm").addEventListener("submit", async event => {
  event.preventDefault();
  const text = $("messageInput").value.trim();
  if (!text || active === null) return;
  const c = chats.find(x => String(x.id) === String(active));
  if (remoteMode) {
    try {
      const result = await api(`/api/conversations/${encodeURIComponent(active)}/messages`,{method:"POST",body:JSON.stringify({body:text})});
      if (!c.messages.some(m => m.id === result.message.id)) c.messages.push(toClientMessage(result.message));
      c.preview = text; c.time = nowTime();
    } catch (error) { setConnection(error.message); return; }
  } else {
    setConnection("غير متصل — لم تُرسل الرسالة");
    return;
  }
  $("messageInput").value = ""; drawMessages(); drawList();
});
let typingTimer = null;
$("messageInput").addEventListener("input", () => {
  if (!socket?.connected || !active) return;
  socket.emit("typing:update",{conversationId:active,active:true});
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => socket?.emit("typing:update",{conversationId:active,active:false}),1100);
});
$("search").addEventListener("input",drawList);
document.querySelectorAll(".filter").forEach(b => b.onclick = () => {
  filter = b.dataset.filter;
  document.querySelectorAll(".filter").forEach(x => x.classList.toggle("active",x===b));
  drawList();
});
$("backBtn").onclick = () => document.querySelector(".app").classList.remove("open-thread");
$("newChat").onclick = async () => {
  if (!remoteMode) { alert("اتصال الخادم غير متاح حالياً. حاول تحديث الصفحة."); return; }
  const makeGroup = confirm("موافق = إنشاء مجموعة\nإلغاء = محادثة شخصية");
  try {
    if (makeGroup) {
      const title = prompt("اسم المجموعة:");
      if (!title?.trim()) return;
      const raw = prompt("أسماء المستخدمين لإضافتهم، افصل بينها بفاصلة:");
      if (!raw?.trim()) return;
      const names = [...new Set(raw.split(",").map(x=>x.trim().replace(/^@/,"").toLowerCase()).filter(Boolean))];
      if (!names.length || names.length > 99) { alert("أدخل من 1 إلى 99 مستخدماً."); return; }
      const ids = [];
      for (const username of names) {
        const found = await api("/api/users/search?q="+encodeURIComponent(username));
        const person = found.users.find(u => u.username.toLowerCase() === username);
        if (!person) throw new Error("لم نعثر على المستخدم @"+username);
        ids.push(person.id);
      }
      const result = await api("/api/conversations",{method:"POST",body:JSON.stringify({type:"group",title:title.trim(),memberUserIds:ids})});
      await loadConversations(); openChat(result.conversation.id);
    } else {
      const username = prompt("اكتب اسم المستخدم الذي تريد مراسلته:");
      if (!username?.trim()) return;
      const normalized = username.trim().replace(/^@/,"").toLowerCase();
      const found = await api("/api/users/search?q="+encodeURIComponent(normalized));
      const person = found.users.find(u => u.username.toLowerCase() === normalized);
      if (!person) { alert("لم يتم العثور على اسم المستخدم."); return; }
      const result = await api("/api/conversations",{method:"POST",body:JSON.stringify({type:"direct",memberUserIds:[person.id]})});
      await loadConversations(); openChat(result.conversation.id);
    }
  } catch (error) { alert(error.message); }
};
$("attachBtn").onclick = () => $("fileInput").click();
$("fileInput").onchange = () => {
  const f = $("fileInput").files[0];
  if (!f) return;
  alert("رفع الصور والملفات السحابي قيد التطوير. لم يتم إرسال هذا الملف.");

  $("fileInput").value = "";
};
$("accountBtn").onclick = () => {
  if (remoteMode && currentUser) {
    if (confirm("الحساب: @"+currentUser.username+"\nهل تريد تسجيل الخروج؟")) {
      token = null; currentUser = null; sessionStorage.removeItem("thunder_token");
      socket?.disconnect(); chats = []; active = null; showAuth(true); setAuthMode("login");
    }
  } else alert("سجّل الدخول بعد استعادة الاتصال بالخادم.");
};
$("menuBtn").onclick = () => {
  if (remoteMode && currentUser) alert("حسابك: @"+currentUser.username);
  else alert("الخادم غير متاح. حدّث الصفحة وحاول مجدداً.");
};
drawList();
bootRemote();
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
