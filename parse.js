// A small, dependency-free CommonMark/GFM renderer. Parsing state belongs to one
// document; recursive containers share only that document's reference table.
const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
const punctuation = /[!-/:-@[-`{-~]/;
const namedEntities = Object.freeze({ amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:'\u00a0',copy:'©',reg:'®',trade:'™',mdash:'—',ndash:'–',hellip:'…',lsquo:'‘',rsquo:'’',ldquo:'“',rdquo:'”',euro:'€',pound:'£',yen:'¥',cent:'¢',ouml:'ö',Ouml:'Ö',auml:'ä',Auml:'Ä',uuml:'ü',Uuml:'Ü',eacute:'é',Eacute:'É',agrave:'à',deg:'°',times:'×',divide:'÷',plusmn:'±',micro:'µ',para:'¶',bull:'•',rarr:'→',larr:'←',harr:'↔',mdash:'—',apos:"'" });
function decodeEntities(s) {
  return s.replace(/&(#(?:x[\da-f]+|\d+)|[a-z][a-z\d]+);/gi, (raw, name) => {
    if (name[0] !== '#') return namedEntities[name] ?? raw;
    let cp = name[1]?.toLowerCase() === 'x' ? parseInt(name.slice(2),16) : Number(name.slice(1));
    if (!cp || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) cp = 0xfffd;
    return String.fromCodePoint(cp);
  });
}
const attr = s => escapeHtml(decodeEntities(String(s)).replace(/\\([!"#$%&'()*+,\-./:;<=>?@\\\[\]^_`{|}~])/g,'$1'));
function normalizeLabel(s) { return decodeEntities(s.trim().replace(/\\([!"#$%&'()*+,\-./:;<=>?@\\\[\]^_`{|}~])/g,'$1').replace(/\s+/g,' ')).toLowerCase(); }
function inline(src, refs, depth=0, inLink=false) {
  if (depth > 12) return escapeHtml(src);
  let out='', i=0;
  while (i<src.length) {
    const s=src.slice(i); let m;
    if ((m=/^\\([\s\S])/.exec(s))) { out+=escapeHtml(m[1]); i+=m[0].length; continue; }
    if ((m=/^\\\n/.exec(s))) { out+='<br>\n'; i+=2; continue; }
    if ((m=/^ {2,}\n/.exec(s))) { out+='<br>\n'; i+=m[0].length; continue; }
    if ((m=/^(`+)([\s\S]*?)\1(?!`)/.exec(s))) { let code=m[2].replace(/\n/g,' '); if (/^ .* $/.test(code) && /[^ ]/.test(code)) code=code.slice(1,-1); out+='<code>'+escapeHtml(code.replace(/\u0000/g,'\ufffd'))+'</code>'; i+=m[0].length; continue; }
    if ((m=/^&(?:#(?:x[\da-f]+|\d+)|[a-z][a-z\d]+);/i.exec(s))) { out+=escapeHtml(decodeEntities(m[0])); i+=m[0].length; continue; }
    if ((m=/^<((?:[a-z][a-z\d+.-]{1,31}:[^ <>]*|[^ <>@]+@[^ <>@]+\.[a-z]{2,}))>/i.exec(s))) { const u=m[1]; out+='<a href="'+attr(u.includes('@')&&!u.includes(':')?'mailto:'+u:u)+'">'+escapeHtml(u)+'</a>'; i+=m[0].length; continue; }
    if ((m=/^<(https?:\/\/[^ <>]+)>/i.exec(s))) { out+='<a href="'+attr(m[1])+'">'+escapeHtml(m[1])+'</a>'; i+=m[0].length; continue; }
    if ((m=/^(!?)\[((?:\\.|[^\[\]])*)\]\s*\(/.exec(s))) {
      let p=i+m[0].length, url='', title='', angle=false;
      if (src[p]==='<') { angle=true; p++; const end=src.indexOf('>',p); if(end<0){out+=escapeHtml(src[i]);i++;continue;} url=src.slice(p,end);p=end+1; }
      else { let nest=0; while(p<src.length){const c=src[p];if(c==='\\'&&p+1<src.length){url+=src.slice(p,p+2);p+=2;continue;}if(c==='('){nest++;if(nest>32)break;}if(c===')'){if(!nest)break;nest--;}if(/\s/.test(c)&&!nest)break;url+=c;p++;} }
      while(src[p]===' '||src[p]==='\n')p++;
      if (src[p]!==')' && src[p] && /["'(]/.test(src[p])) { const close=src[p]==='('?')':src[p];p++;let t='';while(p<src.length&&src[p]!==close){if(src[p]==='\\'&&p+1<src.length){t+=src.slice(p,p+2);p+=2;}else t+=src[p++];}if(src[p]===close){title=t;p++;while(src[p]===' '||src[p]==='\n')p++;} }
      if(src[p]===')' && (!angle || !/[<>\n]/.test(url))) { p++; const image=m[1]==='!', label=m[2]; out+=image?'<img src="'+attr(url)+'" alt="'+attr(label)+'"'+(title?' title="'+attr(title)+'"':'')+' />':'<a href="'+attr(url)+'"'+(title?' title="'+attr(title)+'"':'')+'>'+inline(label,refs,depth+1,true)+'</a>'; i=p;continue; }
    }
    if ((m=/^(!?)\[((?:\\.|[^\[\]])+)\](?:\[([^\]]*)\])?/.exec(s))) { const key=normalizeLabel(m[3]||m[2]), r=refs[key]; if(r){const image=m[1]==='!';out+=image?'<img src="'+attr(r.url)+'" alt="'+attr(m[2])+'"'+(r.title?' title="'+attr(r.title)+'"':'')+' />':'<a href="'+attr(r.url)+'"'+(r.title?' title="'+attr(r.title)+'"':'')+'>'+inline(m[2],refs,depth+1,true)+'</a>';i+=m[0].length;continue;} }
    if ((m=/^<([a-z][a-z\d-]*)(?:\s[^<>]*?)?\s*\/?\s*>/i.exec(s)) || (m=/^<\/([a-z][a-z\d-]*)\s*>/i.exec(s)) || (m=/^<!--[^]*?-->|^<\?[\s\S]*?\?>|^<![A-Z][^>]*>/i.exec(s))) { if(!/^(?:script|style|xmp|iframe|noembed|noframes|plaintext)$/i.test(m[1]||'')){out+=m[0];i+=m[0].length;continue;} }
    if (!inLink && ((m=/^(?:https?:\/\/|ftp:\/\/|www\.)[^\s<>]+/i.exec(s)) || (m=/^[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.exec(s)))) { let u=m[0], shown=u; while(/[.,!?;:*_~]/.test(u.at(-1)))u=u.slice(0,-1); if(/[)]/.test(u.at(-1))&&(u.match(/\(/g)||[]).length<(u.match(/\)/g)||[]).length)u=u.slice(0,-1); if(u){out+='<a href="'+attr(/^[\w.+-]+@/.test(u)?'mailto:'+u:/^www\./i.test(u)?'http://'+u:u)+'">'+escapeHtml(u)+'</a>'+escapeHtml(shown.slice(u.length));i+=m[0].length;continue;} }
    // Delimiter runs: flanking rules prevent intraword underscores and empty
    // emphasis, while consuming the closest valid closing run.
    if ((m=/^(\*+|_+|~+)/.exec(s))) {
      const run=m[0], ch=run[0], before=i?src[i-1]:'\n', after=src[i+run.length]||'\n';
      const leftWhite=/\s/.test(after), rightWhite=/\s/.test(before), leftP=punctuation.test(after), rightP=punctuation.test(before);
      const canOpen=!leftWhite&&(!leftP||rightWhite||rightP), canClose=!rightWhite&&(!rightP||leftWhite||leftP);
      const count=run.length; let tag='', use=0;
      if(ch==='~'&&count>=2&&canOpen){tag='del';use=2;} else if(ch!=='~'&&canOpen){if(count>=2) {tag='strong';use=2;} else {tag='em';use=1;}}
      if(tag){const marker=ch.repeat(use);let end=-1;for(let j=i+count;j<src.length;){const k=src.indexOf(marker,j);if(k<0)break;const prev=k?src[k-1]:'\n', next=src[k+use]||'\n';const closeWhite=/\s/.test(prev),closeP=punctuation.test(prev),openWhite=/\s/.test(next),openP=punctuation.test(next);const valid=!closeWhite&&(!closeP||openWhite||openP)&&!(ch==='_'&&/[\p{L}\p{N}]/u.test(before)&&/[\p{L}\p{N}]/u.test(next));if(valid&&k>i+count){end=k;break;}j=k+use;}
        if(end>=0){out+='<'+tag+'>'+inline(src.slice(i+count,end),refs,depth+1,inLink)+'</'+tag+'>';i=end+use;continue;}
      }
      out+=escapeHtml(run);i+=run.length;continue;
    }
    if(src[i]==='\n'){out+='\n';i++;continue;}
    out+=escapeHtml(src[i++]);
  }
  return out;
}

const fenceOpen = line => /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
function parse(markdown) {
  if(typeof markdown!=='string')throw new TypeError('markdown must be a string');
  const normalized=markdown.replace(/\r\n?|\u0000/g,c=>c==='\u0000'?'\ufffd':'\n').replace(/[\t ]+$/gm,'');
  const lines=normalized.split('\n'), refs=Object.create(null), content=[];
  // Link definitions are document scoped and may be used before or after their
  // source, so collect them in a first pass.
  for(let i=0;i<lines.length;i++){
    const m=/^ {0,3}\[([^\]]+)\]:[ \t]*(?:<([^<>\n]*)>|(\S+))(?:[ \t]+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?[ \t]*$/.exec(lines[i]);
    if(m){const key=normalizeLabel(m[1]);if(!(key in refs))refs[key]={url:(m[2]??m[3]).replace(/\\([!"#$%&'()*+,\-./:;<=>?@\\\[\]^_`{|}~])/g,'$1'),title:m[4]??m[5]??m[6]??''};content.push('');}else content.push(lines[i]);
  }
  const blank=l=>!l||/^\s*$/.test(l);
  const hr=l=>/^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(l);
  const atx=l=>/^ {0,3}(#{1,6})(?:[ \t]+|$)(.*)$/.exec(l);
  const htmlType=l=>{
    if(/^ {0,3}<!--/.test(l))return 1;if(/^ {0,3}<\?/.test(l))return 2;if(/^ {0,3}<![A-Z]/.test(l))return 3;
    const m=/^ {0,3}<(script|pre|style|textarea)(?:\s|>|$)/i.exec(l);if(m)return 4;
    if(/^ {0,3}<(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:\s|\/?>)/i.test(l))return 5;
    if(/^ {0,3}<\/[A-Za-z][\w-]*\s*>/.test(l)||/^ {0,3}<\?[\s\S]*\?>/.test(l)||/^ {0,3}<![A-Z][^>]*>/.test(l))return 6;
    if(/^ {0,3}<[A-Za-z][\w-]*(?:\s+[^<>]*?)?\s*\/?>(?:\s*)$/.test(l)||/^ {0,3}<\/\s*[A-Za-z][\w-]*\s*>(?:\s*)$/.test(l))return 7;
    return 0;
  };
  const startsBlock=(a,i)=>{const l=a[i]||'';return !!(atx(l)||fenceOpen(l)||hr(l)||/^ {0,3}>/.test(l)||/^ {0,3}(?:[*+-]|\d{1,9}[.)])(?:[ \t]+|$)/.test(l)||htmlType(l));};
  function blocks(a, depth=0){
    if(depth>24)return '<p>'+inline(a.join('\n'),refs)+'</p>\n';
    let out='',i=0;
    while(i<a.length){const l=a[i];if(blank(l)){i++;continue;}let m;
      if((m=atx(l))){let body=m[2].replace(/[ \t]+#+[ \t]*$/,'').trim();out+='<h'+m[1].length+'>'+inline(body,refs)+'</h'+m[1].length+'>\n';i++;continue;}
      if((m=fenceOpen(l))&&!(m[1][0]==='`'&&m[2].includes('`'))){const marker=m[1],ch=marker[0],n=marker.length,info=m[2].trim(),body=[];i++;while(i<a.length&&!new RegExp('^ {0,3}'+(ch==='`'?'`':'~')+'{'+n+',}[ \t]*$').test(a[i]))body.push(a[i++]);if(i<a.length)i++;let cls='';if(info){const word=info.split(/[ \t]+/)[0].replace(/\\([!"#$%&'()*+,\-./:;<=>?@\\\[\]^_`{|}~])/g,'$1');cls=' class="language-'+attr(word)+'"';}out+='<pre><code'+cls+'>'+escapeHtml(body.join('\n')+(body.length?'\n':''))+'</code></pre>\n';continue;}
      if(hr(l)){out+='<hr>\n';i++;continue;}
      if(/^ {0,3}>/.test(l)){const q=[];while(i<a.length&&/^ {0,3}>/.test(a[i]))q.push(a[i++].replace(/^ {0,3}> ?/,''));out+='<blockquote>\n'+blocks(q,depth+1)+'</blockquote>\n';continue;}
      if((m=/^( {0,3})([-+*]|\d{1,9}[.)])(?:[ \t]+(.*)|[ \t]*)$/.exec(l))){
        const base=m[1].length, marker=m[2], ordered=/^\d/.test(marker),tag=ordered?'ol':'ul',start=ordered?parseInt(marker,10):1,items=[];let loose=false;
        while(i<a.length){const im=/^( {0,3})([-+*]|\d{1,9}[.)])(?:[ \t]+(.*)|[ \t]*)$/.exec(a[i]);if(!im||im[1].length!==base||/^\d/.test(im[2])!==ordered)break;
          const itemIndent=im[1].length+im[2].length+1, item=[im[3]||''];i++;
          while(i<a.length){if(blank(a[i])){if(i+1<a.length&&(/^ {0,3}(?:[-+*]|\d{1,9}[.)])(?:[ \t]+|$)/.test(a[i+1])||/^ {0,}/.test(a[i+1])&&a[i+1].length>=itemIndent)){if(!/^ {0,3}(?:[-+*]|\d{1,9}[.)])(?:[ \t]+|$)/.test(a[i+1]))loose=true;item.push('');i++;continue;}i++;break;}
            const next=/^( {0,3})([-+*]|\d{1,9}[.)])(?:[ \t]+|$)/.exec(a[i]);if(next&&next[1].length===base)break;
            const indent=/^ */.exec(a[i])[0].length;if(indent>base){item.push(a[i].slice(Math.min(indent,itemIndent)));i++;continue;}
            if(startsBlock(a,i))break;item.push(a[i]);i++;
          }
          const task=/^\[([ xX])\](?:[ \t]+|$)([\s\S]*)$/.exec(item[0]);if(task)item[0]=task[2];let inner=blocks(item,depth+1).trimEnd();if(!loose)inner=inner.replace(/<\/?p>/g,'');const checkbox=task?'<input type="checkbox" disabled=""'+(task[1].toLowerCase()==='x'?' checked=""':'')+'> ':'';items.push('<li>'+checkbox+inner+'</li>');
        }
        out+='<'+tag+(ordered&&start!==1?' start="'+start+'"':'')+'>\n'+items.join('\n')+'\n</'+tag+'>\n';continue;
      }
      // GFM tables, with escaped pipes and pipes inside code spans respected.
      if(i+1<a.length&&l.includes('|')){const split=row=>{let s=row.trim().replace(/^\|/,'').replace(/\|$/,'');const cells=[];let cell='',ticks=0,esc=false;for(let k=0;k<s.length;k++){const c=s[k];if(c==='\\'&&!esc){cell+=c;esc=true;continue;}if(c==='`'&&!esc){let j=k;while(s[j]==='`')j++;const n=j-k;if(!ticks)ticks=n;else if(ticks===n)ticks=0;cell+=s.slice(k,j);k=j-1;continue;}if(c==='|'&&!ticks&&!esc){cells.push(cell.trim());cell='';}else cell+=c;esc=false;}cells.push(cell.trim());return cells;};const heads=split(l),ds=split(a[i+1]);if(heads.length===ds.length&&ds.length&&ds.every(x=>/^:?-+:?$/.test(x))){const align=ds.map(x=>x.startsWith(':')?(x.endsWith(':')?'center':'left'):(x.endsWith(':')?'right':''));const row=(values,tag)=>'<tr>\n'+values.map((v,k)=>'<'+tag+(align[k]?' align="'+align[k]+'"':'')+'>'+inline(v,refs)+'</'+tag+'>\n').join('')+'</tr>\n';out+='<table>\n<thead>\n'+row(heads,'th')+'</thead>\n';i+=2;let body='';while(i<a.length&&!blank(a[i])&&a[i].includes('|')){body+=row(split(a[i]),'td');i++;}if(body)out+='<tbody>\n'+body+'</tbody>\n';out+='</table>\n';continue;}}
      const ht=htmlType(l);if(ht){const raw=[];i++;raw.push(l);if(ht===1){while(i<a.length){raw.push(a[i]);if(a[i++].includes('-->'))break;}}else if(ht===4){const name=(/^ {0,3}<(script|pre|style|textarea)/i.exec(l)||[])[1];while(i<a.length){raw.push(a[i]);if(new RegExp('</'+name+'\\s*>','i').test(a[i++]))break;}}else if(ht===5||ht===6||ht===7){while(i<a.length&&!blank(a[i]))raw.push(a[i++]);}else {while(i<a.length&&!blank(a[i]))raw.push(a[i++]);}out+=raw.join('\n')+'\n';continue;}
      if(/^ {4}/.test(l)){const code=[];while(i<a.length){if(/^ {4}/.test(a[i])){code.push(a[i++].slice(4));continue;}if(blank(a[i])){code.push('');i++;continue;}break;}while(code.length&&code.at(-1)==='')code.pop();out+='<pre><code>'+escapeHtml(code.join('\n')+'\n')+'</code></pre>\n';continue;}
      if(i+1<a.length&&/^ {0,3}(?:=+|-+)\s*$/.test(a[i+1])){const level=a[i+1].includes('=')?1:2;out+='<h'+level+'>'+inline(l.trim(),refs)+'</h'+level+'>\n';i+=2;continue;}
      const para=[l];i++;while(i<a.length&&!blank(a[i])&&!startsBlock(a,i)&&!(i+1<a.length&&/^ {0,3}(?:=+|-+)\s*$/.test(a[i+1]))){para.push(a[i++]);}if(i+1<a.length&&/^ {0,3}(?:=+|-+)\s*$/.test(a[i])){const level=a[i].includes('=')?1:2;out+='<h'+level+'>'+inline(para.join('\n'),refs)+'</h'+level+'>\n';i++;}else out+='<p>'+inline(para.join('\n'),refs)+'</p>\n';
    }
    return out;
  }
  return blocks(content);
}
export { parse };
