function YO(){
var T=document.querySelector('#divOnyazi table');if(!T||T.__yo)return;
var c=[].slice.call(T.querySelectorAll('td')).map(function(td){var s=td.querySelector('strong,b');if(!s)return null;var l=s.textContent.replace(/:\s*$/,'').trim(),v=td.textContent.replace(s.textContent,'').trim();return l&&v?{l:l,v:v}:null});
if(!c.length||c.indexOf(null)>-1)return;T.__yo=1;
var ns='http://www.w3.org/2000/svg';
var R=' stroke="#ff6b7d"';
var I={
d:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5" stroke-opacity=".55"/><path d="M8.6 12h6.8M10 10.6L8.6 12l1.4 1.4M14 10.6l1.4 1.4-1.4 1.4"'+R+'/>',
D:'<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="3.6" stroke-opacity=".55"/><path d="M2.6 12h18.8M4 10.6L2.6 12 4 13.4M20 10.6l1.4 1.4-1.4 1.4"'+R+'/>',
B:'<rect x="6.5" y="8" width="11" height="13" rx="1.6"/><circle cx="12" cy="14.5" r="2.3" stroke-opacity=".7"/><path d="M6.5 4h11M8 2.6L6.5 4 8 5.4M16 2.6L17.5 4 16 5.4"'+R+'/>',
m:'<path d="M12 2.8l7.2 3v5.4c0 4.6-3.1 8.2-7.2 10-4.1-1.8-7.2-5.4-7.2-10V5.8z"/><path d="M8.8 12.2l2.2 2.2 4.4-4.6"'+R+'/>',
n:'<path d="M3.5 12.3V4.5a1 1 0 0 1 1-1h7.8l9 9a1.4 1.4 0 0 1 0 2l-6.8 6.8a1.4 1.4 0 0 1-2 0z"/><circle cx="8.2" cy="8.2" r="1.6"'+R+'/>',
k:'<circle cx="12" cy="12" r="8.8"/><circle cx="12" cy="12" r="5.6" stroke-dasharray="2.2 1.8"'+R+'/><circle cx="12" cy="12" r="2.4" stroke-opacity=".55"/>',
s:'<path d="M12 3l9 4.8-9 4.8-9-4.8z"/><path d="M3 12.2l9 4.8 9-4.8M3 16.6l9 4.8 9-4.8" stroke-opacity=".75"/><circle cx="12" cy="7.8" r="1.2"'+R+'/>',
w:'<path d="M8.5 8.5a3.5 3.5 0 1 1 7 0"/><path d="M6 9h12l2.2 11.2H3.8z"/><path d="M10 15h4"'+R+'/>',
t:'<path d="M14 14.6V5a2 2 0 1 0-4 0v9.6a4.2 4.2 0 1 0 4 0z"/><path d="M12 9v8"'+R+'/><circle cx="12" cy="17.6" r="1.4"'+R+'/>',
x:'<path d="M3 5.5h18v3.5H3z"/><path d="M5.5 9v10l2.5-2V9M15 9v5"/><path d="M9 5.5v2M12 5.5v2M15 5.5v2M18 5.5v2"'+R+'/>'};
function ic(l){return /^(iç|İç)\s*çap/i.test(l)?'d':/^dış\s*çap/i.test(l)?'D':/^(genişlik|kalınlık|yükseklik)/i.test(l)?'B':/marka/i.test(l)?'m':/kapak|keçe|conta|sızdırmaz/i.test(l)?'k':/seri|tip|tür|model/i.test(l)?'s':/yük|ağırlık/i.test(l)?'w':/sıcaklık/i.test(l)?'t':/(no|kod|numara)$/i.test(l)?'n':'x'}
if(!document.getElementById('yonCss')){var st=document.createElement('style');st.id='yonCss';st.textContent=
'.yon{display:grid;grid-template-columns:repeat(var(--c),minmax(0,1fr));gap:1px;background:#e3e8ef;border:1px solid #e3e8ef;border-radius:14px;overflow:hidden;margin:14px 0 4px;box-shadow:0 4px 14px rgba(15,39,66,.05);font-family:inherit}'+
'.yon .oi{background:linear-gradient(180deg,#fff,#f8fafc);padding:11px 12px;display:flex;align-items:center;gap:10px;min-width:0;transition:background .15s}'+
'.yon .oi:hover{background:#fff}'+
'.yon .ic{flex:0 0 34px;width:34px;height:34px;border-radius:10px;background:linear-gradient(140deg,#16365f,#0f2742 60%,#0a1d33);box-shadow:0 3px 8px rgba(15,39,66,.22),inset 0 1px 0 rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;transition:transform .2s,box-shadow .2s}.yon .oi:hover .ic{transform:translateY(-1px) rotate(-4deg);box-shadow:0 5px 12px rgba(15,39,66,.3)}.yon .oi.m .ic{background:linear-gradient(140deg,#e0263f,#c8102e 60%,#a50d26)}.yon .oi.m .ic [stroke]{stroke:#fff}'+
'.yon .ic svg{width:21px;height:21px;fill:none;stroke:#fff;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}'+
'.yon .tx{display:flex;flex-direction:column;min-width:0;gap:1px}'+
'.yon small{font-size:10.5px;font-weight:600;color:#64748b;letter-spacing:.4px;text-transform:uppercase;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
'.yon b{font-size:16px;font-weight:800;color:#0f2742;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
'@media(min-width:992px){.RightDetail{padding-left:36px!important}}.yon b .u{font-family:inherit!important;font-style:normal;font-size:11.5px;font-weight:600;color:#64748b;margin-left:2px}'+
'.yon .oi.m b{color:#c8102e}'+'.yon.cmp .oi{display:grid;grid-template-columns:20px minmax(0,1fr);column-gap:6px;row-gap:3px;align-items:center;padding:9px 10px}.yon.cmp .tx{display:contents}.yon.cmp .ic{width:20px;height:20px;border-radius:6px;box-shadow:0 2px 5px rgba(15,39,66,.2)}.yon.cmp .ic svg{width:14px;height:14px;stroke-width:1.9}.yon.cmp b{grid-column:1/-1}.yon.cmp small{letter-spacing:.1px}'+
'@media(max-width:767px){.yon{margin:10px 0 2px;border-radius:12px}.yon .oi{padding:9px 10px;gap:8px}.yon .ic{flex-basis:28px;width:28px;height:28px;border-radius:8px}.yon .ic svg{width:18px;height:18px}.yon small{font-size:9.5px;letter-spacing:.2px}.yon b{font-size:14.5px;white-space:normal;overflow-wrap:anywhere}}';
document.head.appendChild(st)}
var n=c.length,mob=matchMedia('(max-width:767px)').matches,col=mob?(n<=3?n:n==4?2:3):(n<=5?n:Math.ceil(n/2));
var d=document.createElement('div');d.className='yon'+((!mob&&col>=5)||(mob&&col==3)?' cmp':'');d.style.setProperty('--c',col);
c.forEach(function(x,i){var k=ic(x.l),e=document.createElement('div');e.className='oi '+k;e.title=x.l+': '+x.v;
var g=document.createElement('span');g.className='ic';var sv=document.createElementNS(ns,'svg');sv.setAttribute('viewBox','0 0 24 24');sv.innerHTML=I[k];g.appendChild(sv);
var t=document.createElement('span');t.className='tx';var a=document.createElement('small');a.textContent=x.l;var b=document.createElement('b');
var mm=x.v.match(/^([\d.,]+)\s*(mm|cm|kg|gr|g|kN|N)$/);if(mm){b.textContent=mm[1];var u=document.createElement('span');u.className='u';u.textContent=mm[2];b.appendChild(u)}else b.textContent=x.v;
t.appendChild(a);t.appendChild(b);e.appendChild(g);e.appendChild(t);
var r=n%col;if(r&&i==n-1)e.style.gridColumn='span '+(col-r+1);d.appendChild(e)});
T.style.display='none';T.parentNode.insertBefore(d,T);
}
