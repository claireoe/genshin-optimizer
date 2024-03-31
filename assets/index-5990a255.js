import{e as o,p as e,n as x,aH as Q,aI as V,V as K,aJ as z,aK as R,q as W,u as L,ab as Y,b as J,d as Z,ar as X,aL as E,Z as ee,aE as ae,Q as te,aM as re,K as $,J as P,C as A,Y as F,B as _,D as se,T as oe,aN as ne,aO as le}from"./index-0bfb80db.js";import{T as O,A as ie,C as ce,f as me,s as ue,u as he,a as de,S as pe}from"./StarDisplay-4d38d558.js";import{a as fe,T as ge,d as ye}from"./TeamCard-a3aa2aac.js";import{d as B}from"./Upload-f422ab4d.js";import{M as Ce}from"./DropdownButton-b5c44fa5.js";import{g as Te}from"./index-ab9b4472.js";import{b as xe}from"./totalUtils-72821582.js";import{C as we}from"./StatIcon-0c3df2b0.js";import"./ColoredText-28f668ea.js";import"./BootstrapTooltip-6f410d48.js";import"./DataContext-1ad4458e.js";import"./Artifact-2f842e69.js";import"./SqBadge-9136c7de.js";import"./index-8166b755.js";import"./SlotIcon-30436187.js";import"./useWeapon-9acab710.js";import"./index-27ae26ad.js";import"./CardActionArea-121ae99c.js";function ve({options:c,valueKeys:a,label:d,onChange:u,toImg:p,toExItemLabel:g,toExLabel:l,chipProps:f,...C}){const b=o.useMemo(()=>a.map(n=>c.find(r=>r.key===n)).filter(n=>n),[c,a]);return e(ie,{autoHighlight:!0,options:c,multiple:!0,disableCloseOnSelect:!0,value:b,onChange:(n,r,m)=>m==="clear"?u([]):r!==null&&u(r.map(i=>i.key)),isOptionEqualToValue:(n,r)=>n.key===r.key,renderInput:n=>e(O,{...n,label:d,inputProps:{...n.inputProps,autoComplete:"new-password"},color:a.length?"success":"primary"}),renderOption:(n,r)=>x(Ce,{value:r.key,...n,children:[e(Q,{children:p(r.key)}),e(V,{children:e(o.Suspense,{fallback:e(K,{variant:"text",width:100}),children:x(z,{color:r.color,sx:{display:"flex",gap:1},children:[a.includes(r.key)?e("strong",{children:r.label}):e("span",{children:r.label}),g==null?void 0:g(r.key)]})})}),!!r.favorite&&e(fe,{})]}),renderTags:(n,r)=>n.map(({key:m,label:i,color:T},w)=>R(W,{...f,...r({index:w}),key:`${w}${m}${i}`,icon:p(m),label:l?x("span",{children:[i," ",l(m)]}):i,color:T})),filterOptions:(n,{inputValue:r})=>n.filter(m=>{var i;return m.label.toLowerCase().includes(r.toLowerCase())||((i=m.alternateNames)==null?void 0:i.some(T=>T.toLowerCase().includes(r.toLowerCase())))}),...C})}function Se({teamIds:c,charKeys:a,setCharKey:d,acProps:u}){const{t:p}=L(["sillyWisher_charNames","charNames_gen"]),{silly:g}=o.useContext(Y),l=J(),{gender:f}=Z(),C=o.useCallback(t=>l.charMeta.get(t).favorite,[l.charMeta]),b=o.useCallback(t=>e(ce,{characterKey:t}),[]),n=o.useCallback((t,h)=>p(`${h?"sillyWisher_charNames":"charNames_gen"}:${X(t,f)}`),[f,p]),r=o.useCallback(t=>Te(t,f).elementKey??void 0,[f]),m=o.useMemo(()=>l.chars.keys,[l]),{characterTeamTotal:i}=o.useMemo(()=>xe({characterTeamTotal:m},h=>{l.teams.values.forEach(y=>{const{loadoutData:v}=y;v.filter(E).forEach(({teamCharId:N})=>{const k=l.teamChars.get(N);if(!k)return;const I=k.key;h.characterTeamTotal[I].total++})}),c.forEach(y=>{const v=l.teams.get(y);if(!v)return;const{loadoutData:N}=v;N.filter(E).forEach(({teamCharId:k})=>{const I=l.teamChars.get(k);if(!I)return;const D=I.key;h.characterTeamTotal[D].current++})})}),[l,m,c]),T=o.useCallback(t=>e("strong",{children:i[t]}),[i]),w=o.useCallback(t=>e(W,{size:"small",label:i[t]}),[i]),M=o.useMemo(()=>m.map(t=>({key:t,label:n(t,g),alternateNames:g?[n(t,!g)]:void 0,favorite:C(t),color:r(t)})).sort((t,h)=>t.favorite&&!h.favorite?-1:!t.favorite&&h.favorite?1:t.label.localeCompare(h.label)),[g,n,r,C,m]);return e(o.Suspense,{fallback:e(K,{variant:"text",width:100}),children:e(ve,{label:"Characters",options:M,toImg:b,valueKeys:a,onChange:t=>d(t),toExLabel:T,toExItemLabel:w,chipProps:{variant:"outlined"},...u})})}function be(){return{name:c=>c.name??"",lastEdit:c=>c.lastEdit??0}}const ke={name:["name","lastEdit"],lastEdit:["lastEdit"]};function Ie(c){return{charKeys:(a,d)=>{var l;if(!d.length)return!0;const u=(l=c.teams.get(a))==null?void 0:l.loadoutData.filter(E),p=u==null?void 0:u.map(({teamCharId:f})=>{var C;return(C=c.teamChars.get(f))==null?void 0:C.key}).filter(E);return d.every(f=>p==null?void 0:p.includes(f))},name:(a,d)=>{var u;return!d||!!((u=c.teams.get(a))!=null&&u.name.toLowerCase().includes(d.toLowerCase()))}}}const Ne={xs:1,sm:2,md:3,lg:3,xl:3},De={xs:6,sm:12,md:18,lg:24,xl:24};function Qe(){const{t:c}=L(["page_teams","sillyWisher_charNames","charNames_gen"]),a=J(),[d,u]=ee(),p=ae();o.useEffect(()=>a.teams.followAny((s,S)=>(S==="new"||S==="remove"||S==="update")&&u()),[u,a]);const g=()=>{const s=a.teams.new();p(s)},[l,f,C]=te(),[b,n]=o.useState(""),r=()=>{try{const s=JSON.parse(b);a.teams.import(s)||window.alert("Data verification failed."),C()}catch(s){window.alert(`Data Import failed. ${s}`);return}},m=re(a.displayTeam),{sortType:i,ascending:T,charKeys:w}=m,[M,t]=o.useState(m.searchTerm),h=o.useDeferredValue(M);o.useEffect(()=>{a.displayTeam.set({searchTerm:h})},[a,h]);const{teamIds:y,totalTeamNum:v}=o.useMemo(()=>{const s=a.teams.keys.length,S=a.teams.keys.filter(me({charKeys:w,name:h},Ie(a))).sort((U,q)=>ue(ke[i],T,be())(a.teams.get(U),a.teams.get(q)));return d&&{teamIds:S,totalTeamNum:s}},[d,a,w,h,i,T]),N=he(),{numShow:k,setTriggerElement:I}=de(De[N],y.length),D=o.useMemo(()=>y.slice(0,k),[y,k]),j=y.length!==v?`${y.length}/${v}`:`${v}`,G={numShowing:D.length,total:j,t:c,namespace:"page_teams"},H={sortKeys:[...le],value:i,onChange:s=>a.displayTeam.set({sortType:s}),ascending:T,onChangeAsc:s=>a.displayTeam.set({ascending:s})};return x($,{my:1,display:"flex",flexDirection:"column",gap:1,children:[e(F,{children:x(A,{sx:{display:"flex",flexDirection:"column",gap:1},children:[x($,{display:"flex",gap:1,alignItems:"stretch",children:[e(Se,{teamIds:y,charKeys:w,setCharKey:s=>a.displayTeam.set({charKeys:s}),acProps:{sx:{flexGrow:1}}}),e(O,{autoFocus:!0,value:M,onChange:s=>t(s.target.value),label:"Team Name",sx:{height:"100%",flexGrow:1},InputProps:{sx:{height:"100%"}}})]}),e($,{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",children:e(pe,{showingTextProps:G,sortByButtonProps:H})})]})}),x($,{sx:{display:"flex",gap:1},children:[e(_,{fullWidth:!0,onClick:g,color:"info",startIcon:e(ye,{}),children:"Add Team"}),e(ne,{open:l,onClose:C,children:x(F,{children:[e(we,{title:"Import Team"}),e(se,{}),x(A,{sx:{display:"flex",flexDirection:"column",gap:2},children:[e(oe,{children:"Import a team in JSON form below."}),e(O,{fullWidth:!0,label:"JSON Data",placeholder:"Paste your Team JSON here",value:b,onChange:s=>n(s.target.value),multiline:!0,rows:4}),e(_,{startIcon:e(B,{}),disabled:!b,onClick:r,children:"Import"})]})]})}),e(_,{fullWidth:!0,onClick:f,color:"info",startIcon:e(B,{}),children:"Import Team"})]}),e(o.Suspense,{fallback:e(K,{variant:"rectangular",sx:{width:"100%",height:"100%",minHeight:5e3}}),children:e(P,{container:!0,spacing:1,columns:Ne,children:D.map(s=>e(P,{item:!0,xs:1,children:e(o.Suspense,{fallback:e(K,{variant:"rectangular",width:"100%",height:150}),children:e(ge,{teamId:s,bgt:"light",onClick:S=>p(`${s}${S?`/${S}`:""}`),hoverCard:!0})})},s))})}),y.length!==D.length&&e(K,{ref:s=>{s&&I(s)},sx:{borderRadius:1},variant:"rectangular",width:"100%",height:100})]})}export{Qe as default};
