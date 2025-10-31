import React from 'react';
import { excelDebug } from '../../lib/data';

export function ExcelDebug() {
  const [visible, setVisible] = React.useState<boolean>(() => {
    return new URLSearchParams(window.location.search).get('debug') === '1';
  });

  if (!visible) return null;
  if (!excelDebug) return (
    <div style={{position:'fixed',bottom:12,right:12,background:'#111',color:'#fff',padding:12,borderRadius:8,maxWidth:420,fontSize:12,zIndex:9999}}>
      <b>Excel Debug</b>
      <div>No excelDebug export available.</div>
    </div>
  );
  const counts = (excelDebug as any).counts || {};
  return (
    <div style={{position:'fixed',bottom:12,right:12,background:'#111',color:'#fff',padding:12,borderRadius:8,maxWidth:420,fontSize:12,zIndex:9999, boxShadow:'0 2px 6px rgba(0,0,0,0.3)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
        <b>Excel Debug</b>
        <button onClick={()=>setVisible(false)} style={{background:'transparent',color:'#fff',border:'1px solid #444',borderRadius:4,padding:'2px 6px'}}>hide</button>
      </div>
      <div>Dir: {(excelDebug as any).dataDir}</div>
      <div>Master: {(excelDebug as any).masterPath ? 'yes' : 'no'}</div>
      <div style={{marginTop:6}}>
        <b>Rows</b>
        <ul>
          <li>finishedGoods: {counts.finishedGoods ?? 0}</li>
          <li>rawMaterials: {counts.rawMaterials ?? 0}</li>
          <li>PO_Combined: {counts.poCombined ?? counts.PO_Combined ?? 0}</li>
          <li>SO_Combined: {counts.soCombined ?? counts.SO_Combined ?? 0}</li>
          <li>Trascations: {counts.Trascations ?? counts.trascations ?? 0}</li>
        </ul>
      </div>
      {(excelDebug as any).sample?.finishedGoods && (excelDebug as any).sample.finishedGoods.length > 0 && (
        <div style={{marginTop:6}}>
          <b>finished goods sample</b>
          <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify((excelDebug as any).sample.finishedGoods, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

