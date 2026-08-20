/* v6 loads current logic, then adds resizable Dimensionamento columns */
(function(){
  const core=document.createElement('script');
  core.src='app-v5.js?v=10';
  core.onload=()=>{
    function attachGridResizers({tableSelector,headSelector,handleClass,varPrefix,count,mins}){
      const table=document.querySelector(tableSelector);
      const headCells=[...document.querySelectorAll(headSelector)];
      if(!table||headCells.length<count)return;
      headCells.slice(0,count-1).forEach((cell,index)=>{
        if(cell.querySelector('.'+handleClass))return;
        const handle=document.createElement('span');
        handle.className=handleClass;
        handle.title='Trascina per ridimensionare · doppio clic per ripristinare';
        cell.appendChild(handle);
        let widths=null;
        const capture=()=>{
          widths=headCells.slice(0,count).map(c=>c.getBoundingClientRect().width);
          widths.forEach((w,i)=>table.style.setProperty(`--${varPrefix}${i+1}`,`${w}px`));
        };
        handle.addEventListener('pointerdown',e=>{
          e.preventDefault();
          if(!widths)capture();
          const startX=e.clientX,startA=widths[index],startB=widths[index+1];
          handle.classList.add('dragging');
          handle.setPointerCapture?.(e.pointerId);
          const move=ev=>{
            let delta=ev.clientX-startX;
            delta=Math.max(mins[index]-startA,Math.min(startB-mins[index+1],delta));
            widths[index]=startA+delta;widths[index+1]=startB-delta;
            table.style.setProperty(`--${varPrefix}${index+1}`,`${widths[index]}px`);
            table.style.setProperty(`--${varPrefix}${index+2}`,`${widths[index+1]}px`);
          };
          const up=ev=>{
            handle.classList.remove('dragging');
            handle.releasePointerCapture?.(ev.pointerId);
            handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);handle.removeEventListener('pointercancel',up);
          };
          handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',up);
        });
        handle.addEventListener('dblclick',()=>{
          widths=null;
          for(let i=1;i<=count;i++)table.style.removeProperty(`--${varPrefix}${i}`);
        });
      });
    }

    attachGridResizers({
      tableSelector:'.dim-table',headSelector:'.dim-head>div',handleClass:'dim-col-resizer',varPrefix:'dim-col',count:7,
      mins:[120,44,62,62,72,72,82]
    });
    attachGridResizers({
      tableSelector:'.dim-phases',headSelector:'.dim-phase-head>div',handleClass:'phase-col-resizer',varPrefix:'phase-col',count:6,
      mins:[115,58,62,72,72,82]
    });
  };
  document.head.appendChild(core);
})();
