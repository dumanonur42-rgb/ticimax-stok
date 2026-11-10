/* Açıklama sekmesi düzeni: metin aynı kalır, sadece görünüm. */
(function(){
var A=document.querySelector('#divTabOzellikler .urunTabAlt');if(!A||A.__yd)return;A.__yd=1;
if(A.querySelector('div[style]'))return;
var st=document.createElement('style');st.textContent='\
.ydsc{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:28px;align-items:start;color:#334155;font-size:14.5px;line-height:1.7}\
.ydsc.one{grid-template-columns:minmax(0,1fr)}\
.ydsc .ym>h2{font-size:20px;line-height:1.35;color:#0f2742;margin:0 0 6px;font-weight:700;padding-left:12px;border-left:4px solid #c8102e}\
.ydsc .ym>p{margin:0 0 10px}\
.ydsc .ysc{padding:14px 0 0;margin-top:14px;border-top:1px solid #e6ebf2}\
.ydsc .ysc h3{font-size:15px;color:#0f2742;margin:0 0 6px;font-weight:700}\
.ydsc .ysc p{margin:0 0 8px}.ydsc .ysc p:last-child{margin:0}\
.ydsc .ysc ul{margin:0;padding-left:18px}\
.ydsc .ya{background:#fff;border:1px solid #e3e8ef;border-radius:14px;overflow:hidden;position:sticky;top:90px;box-shadow:0 6px 18px rgba(15,39,66,.06)}\
.urunTabAlt .ydsc .ya h3,.ydsc .ya h3{margin:0;padding:12px 16px;font-size:14px;font-weight:700;color:#fff!important;background:#0f2742;letter-spacing:.2px}\
.ydsc .ya table{width:100%;border-collapse:collapse;font-size:13.5px}\
.ydsc .ya td{padding:9px 16px;border-top:1px solid #edf0f6;vertical-align:top}\
.ydsc .ya tr:nth-child(even) td{background:#f7f9fc}\
.ydsc .ya td:first-child{color:#64748b;width:46%}\
.ydsc .ya td:last-child{color:#0f2742;font-weight:700}\
@media(max-width:991px){.ydsc{grid-template-columns:minmax(0,1fr);gap:16px}.ydsc .ya{position:static;order:-1}.ydsc .ym>h2{font-size:17px}}';
document.head.appendChild(st);
var w=document.createElement('div');w.className='ydsc';var m=document.createElement('div');m.className='ym';var a=null,cur=null;
[].slice.call(A.childNodes).forEach(function(n){
  if(n.nodeType==3&&!n.textContent.trim())return;
  if(n.nodeType==1&&n.classList.contains('teknikDetay'))return;
  if(n.nodeType==1&&n.tagName=='H3'){cur=document.createElement('div');cur.className='ysc';cur.appendChild(n);m.appendChild(cur);return}
  if(n.nodeType==1&&n.tagName=='UL'&&!a){var li=n.querySelectorAll(':scope>li');
    if(li.length&&[].every.call(li,function(l){return l.querySelector('strong')})){
      a=document.createElement('aside');a.className='ya';var h=cur&&cur.querySelector('h3');
      var t=document.createElement('h3');t.textContent=h?h.textContent:'Özellikler';t.style.setProperty('color','#fff','important');a.appendChild(t);
      if(h&&cur.childNodes.length==1){cur.remove()}
      var tb=document.createElement('table');
      [].forEach.call(li,function(l){var s=l.querySelector('strong'),v=l.textContent.replace(s.textContent,'').trim();if(!v)return;
        var tr=tb.insertRow(),c1=tr.insertCell(),c2=tr.insertCell();c1.textContent=s.textContent.replace(/:\s*$/,'').trim();c2.textContent=v});
      a.appendChild(tb);n.remove();return}}
  (cur||m).appendChild(n);
});
w.appendChild(m);if(a)w.appendChild(a);else w.classList.add('one');
A.insertBefore(w,A.firstChild);
})();
