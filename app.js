const LS_PRODUCTS="siparis_products_v2",LS_CURRENT="siparis_current_order_v2",LS_HISTORY="siparis_history_v2";let products=load(LS_PRODUCTS,[]),currentOrder=load(LS_CURRENT,{}),history=load(LS_HISTORY,[]),deferredPrompt=null;const $=id=>document.getElementById(id);const els={search:$("searchInput"),clearSearch:$("clearSearchBtn"),productList:$("productList"),orderList:$("orderList"),historyList:$("historyList"),productCount:$("productCount"),orderCount:$("orderCount"),importBtn:$("importBtn"),fileInput:$("fileInput"),addProductBtn:$("addProductBtn"),exportProductsBtn:$("exportProductsBtn"),copyBtn:$("copyBtn"),whatsappBtn:$("whatsappBtn"),saveOrderBtn:$("saveOrderBtn"),clearOrderBtn:$("clearOrderBtn"),clearHistoryBtn:$("clearHistoryBtn"),dialog:$("productDialog"),manualName:$("manualProductName"),confirmAdd:$("confirmAddProduct"),installBtn:$("installBtn"),toast:$("toast")};

function normalizeName(name){return String(name||"").trim().replace(/\s+/g," ").toLocaleLowerCase("tr-TR")}
function cleanCell(v){return String(v||"").replace(/^\uFEFF/,"").replace(/^"|"$/g,"").trim()}
function load(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function save(){localStorage.setItem(LS_PRODUCTS,JSON.stringify(products));localStorage.setItem(LS_CURRENT,JSON.stringify(currentOrder));localStorage.setItem(LS_HISTORY,JSON.stringify(history))}
function toast(msg){els.toast.textContent=msg;els.toast.classList.remove("hidden");setTimeout(()=>els.toast.classList.add("hidden"),1800)}

function splitCSVLine(line, delimiter){
  const out=[];let cur="",inside=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i],next=line[i+1];
    if(ch==='"' && inside && next==='"'){cur+='"';i++;continue}
    if(ch==='"'){inside=!inside;continue}
    if(ch===delimiter && !inside){out.push(cur);cur="";continue}
    cur+=ch;
  }
  out.push(cur);
  return out.map(cleanCell);
}

function detectDelimiter(line){
  const semis=(line.match(/;/g)||[]).length;
  const commas=(line.match(/,/g)||[]).length;
  return semis>=commas?";":",";
}

function parseImportedNames(text){
  const lines=String(text||"").split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if(!lines.length)return [];
  const delimiter=detectDelimiter(lines[0]);
  const first=splitCSVLine(lines[0],delimiter).map(x=>normalizeName(x));
  const nameKeys=["name","ürün adı","urun adi","urun adı","ürün adi","product name","product_name"];
  let nameIndex=first.findIndex(h=>nameKeys.includes(h));

  // Başlık yoksa ve tek sütunsa her satırı ürün adı say.
  if(nameIndex<0 && first.length===1)return lines.map(cleanCell);

  // Başlık yoksa ama çok sütun varsa barkod gibi görünen ilk sütunu atlayıp ikinci sütunu al.
  const hasHeader=nameIndex>=0;
  if(nameIndex<0) nameIndex=1;

  const dataLines=hasHeader?lines.slice(1):lines;
  return dataLines.map(line=>{
    const cols=splitCSVLine(line,delimiter);
    return cleanCell(cols[nameIndex]||cols[0]||"");
  }).filter(Boolean);
}

function addProducts(names){let added=0;const existing=new Set(products.map(p=>p.key));names.forEach(raw=>{const name=String(raw||"").trim().replace(/\s+/g," "),key=normalizeName(name);if(!name||existing.has(key))return;products.push({id:crypto.randomUUID(),name,key});existing.add(key);added++});products.sort((a,b)=>a.name.localeCompare(b.name,"tr"));save();render();toast(`${added} yeni ürün eklendi`)}
function removeProduct(id){const p=products.find(x=>x.id===id);if(!p)return;if(!confirm(`"${p.name}" silinsin mi?`))return;products=products.filter(x=>x.id!==id);delete currentOrder[id];save();render()}
function changeQty(id,delta){const next=(currentOrder[id]||0)+delta;if(next<=0)delete currentOrder[id];else currentOrder[id]=next;save();renderOrder();renderProducts()}
function setQty(id,value){const num=Math.max(0,parseInt(value||"0",10));if(!num)delete currentOrder[id];else currentOrder[id]=num;save();renderOrder();renderProducts()}
function getFilteredProducts(){const q=normalizeName(els.search.value);return q?products.filter(p=>p.key.includes(q)):products}

function renderProducts(){const list=getFilteredProducts();els.productCount.textContent=`${products.length} ürün`;els.productList.innerHTML="";if(!list.length){els.productList.className="product-list empty";els.productList.textContent=products.length?"Aramaya uygun ürün yok.":"Henüz ürün yok. CSV/TXT içe aktar veya manuel ekle.";return}els.productList.className="product-list";list.forEach(p=>{const qty=currentOrder[p.id]||0,div=document.createElement("div");div.className="product";div.innerHTML=`<div><div class="product-name"></div><button class="ghost small delete-product">Sil</button></div><div class="qty-controls"><button class="minus">−</button><span class="qty">${qty}</span><button class="plus">+</button></div>`;div.querySelector(".product-name").textContent=p.name;div.querySelector(".minus").onclick=()=>changeQty(p.id,-1);div.querySelector(".plus").onclick=()=>changeQty(p.id,1);div.querySelector(".delete-product").onclick=()=>removeProduct(p.id);els.productList.appendChild(div)})}

function orderLines(){return Object.entries(currentOrder).map(([id,qty])=>({product:products.find(p=>p.id===id),qty})).filter(x=>x.product).sort((a,b)=>a.product.name.localeCompare(b.product.name,"tr"))}
function orderText(){const lines=orderLines(),date=new Date().toLocaleString("tr-TR");return["Sipariş Listesi",date,"",...lines.map(x=>`${x.product.name} x ${x.qty}`)].join("\n")}
function renderOrder(){const lines=orderLines();els.orderCount.textContent=`${lines.length} kalem`;els.orderList.innerHTML="";if(!lines.length){els.orderList.className="order-list empty";els.orderList.textContent="Henüz ürün eklenmedi.";return}els.orderList.className="order-list";lines.forEach(({product,qty})=>{const div=document.createElement("div");div.className="order-item";div.innerHTML=`<div class="order-name"></div><div class="qty-controls"><button class="minus">−</button><input class="qty-input" type="number" min="0" value="${qty}" style="width:70px;text-align:center;padding:9px"><button class="plus">+</button></div>`;div.querySelector(".order-name").textContent=product.name;div.querySelector(".minus").onclick=()=>changeQty(product.id,-1);div.querySelector(".plus").onclick=()=>changeQty(product.id,1);div.querySelector(".qty-input").onchange=e=>setQty(product.id,e.target.value);els.orderList.appendChild(div)})}

function renderHistory(){els.historyList.innerHTML="";if(!history.length){els.historyList.className="history-list empty";els.historyList.textContent="Kayıtlı sipariş yok.";return}els.historyList.className="history-list";history.forEach((h,index)=>{const div=document.createElement("div");div.className="history-item";div.innerHTML=`<div><strong>${h.date}</strong><div class="muted">${h.count} kalem</div><pre></pre></div><div class="qty-controls"><button class="ghost small copy-history">Kopyala</button><button class="danger small delete-history">Sil</button></div>`;div.querySelector("pre").textContent=h.text;div.querySelector(".copy-history").onclick=async()=>{await navigator.clipboard.writeText(h.text);toast("Sipariş kopyalandı")};div.querySelector(".delete-history").onclick=()=>{history.splice(index,1);save();renderHistory()};els.historyList.appendChild(div)})}
function render(){renderProducts();renderOrder();renderHistory()}

els.search.addEventListener("input",renderProducts);
els.clearSearch.onclick=()=>{els.search.value="";renderProducts()};
els.importBtn.onclick=()=>els.fileInput.click();
els.fileInput.onchange=async e=>{const file=e.target.files[0];if(!file)return;const text=await file.text();addProducts(parseImportedNames(text));e.target.value=""};
els.addProductBtn.onclick=()=>{els.manualName.value="";els.dialog.showModal();setTimeout(()=>els.manualName.focus(),100)};
els.confirmAdd.onclick=e=>{e.preventDefault();addProducts([els.manualName.value]);els.dialog.close()};
els.exportProductsBtn.onclick=()=>{const data=products.map(p=>p.name).join("\n"),blob=new Blob([data],{type:"text/plain;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="urunler-yedek.txt";a.click();URL.revokeObjectURL(a.href)};
els.copyBtn.onclick=async()=>{if(!orderLines().length)return toast("Sipariş boş");await navigator.clipboard.writeText(orderText());toast("Liste kopyalandı")};
els.whatsappBtn.onclick=()=>{if(!orderLines().length)return toast("Sipariş boş");window.open(`https://wa.me/?text=${encodeURIComponent(orderText())}`,"_blank")};
els.saveOrderBtn.onclick=()=>{const lines=orderLines();if(!lines.length)return toast("Sipariş boş");const date=new Date().toLocaleString("tr-TR");history.unshift({date,count:lines.length,text:orderText()});history=history.slice(0,50);save();renderHistory();toast("Sipariş kaydedildi")};
els.clearOrderBtn.onclick=()=>{if(!orderLines().length)return;if(!confirm("Aktif sipariş temizlensin mi?"))return;currentOrder={};save();render()};
els.clearHistoryBtn.onclick=()=>{if(!history.length)return;if(!confirm("Tüm sipariş geçmişi silinsin mi?"))return;history=[];save();renderHistory()};
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;els.installBtn.classList.remove("hidden")});
els.installBtn.onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;els.installBtn.classList.add("hidden")};
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
render();