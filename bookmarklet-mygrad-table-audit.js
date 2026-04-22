javascript:(function(){
    var currentUrl=window.location.href;
    var currentYear=2026;
    
    if(currentUrl.indexOf("/mgp-dept.stu.detail/home/studentlist")===-1){
    alert("This bookmarklet only works on the Student List page.");
    return}
    
    /* Inject CSS once */
    if(!document.getElementById("uw-audit-style")){
    var style=document.createElement("style");
    style.id="uw-audit-style";
    style.textContent=`
    tr.ten-year-red, tr.ten-year-red * {
      color:#FFFFFF !important;
      -webkit-text-fill-color:#FFFFFF !important;
    }
    
    /* High-contrast Husky panel - Widened to accommodate counts */
    #uw-controls {
      position:fixed;
      top:80px;
      right:20px;
      z-index:9999;
      background:#4b2e83;
      color:#ffffff;
      border:2px solid #2c1b4f;
      border-radius:10px;
      padding:12px;
      font-family:sans-serif;
      width:170px;
      box-shadow:0 4px 10px rgba(0,0,0,0.4);
    }
    
    #uw-controls .title {
      font-weight:bold;
      margin-bottom:6px;
      text-align:center;
    }
    
    /* Modernized button styles with transitions */
    #uw-controls button {
      display:block;
      width:100%;
      margin:4px 0;
      padding:6px 4px;
      border:1px solid transparent;
      border-radius:4px;
      background:#ffffff;
      color:#4b2e83;
      font-weight:bold;
      cursor:pointer;
      transition:all 0.2s ease;
    }
    
    #uw-controls button:hover {
      background:#e6e0f5;
    }
    
    /* Active state visualization */
    #uw-controls button.active {
      background:#2c1b4f;
      color:#ffffff;
      border:1px solid #b7a5df;
      box-shadow:inset 0 2px 4px rgba(0,0,0,0.3);
    }
    `;
    document.head.appendChild(style);
    }
    
    /* Create control panel with data-label attributes for clean replacement */
    if(!document.getElementById("uw-controls")){
    var panel=document.createElement("div");
    panel.id="uw-controls";
    panel.innerHTML=`
    <div class="title">Filter</div>
    <button data-filter="all" data-label="All">All</button>
    <button data-filter="6" data-label="≥ 6 years">≥ 6 years</button>
    <button data-filter="8" data-label="≥ 8 years">≥ 8 years</button>
    <button data-filter="10" data-label="≥ 10 years">≥ 10 years</button>
    <button data-filter="noadv" data-label="No advisor">No advisor</button>
    `;
    document.body.appendChild(panel);
    
    panel.querySelectorAll("button").forEach(function(btn){
    btn.onclick=function(){
    localStorage.setItem("uw-filter",btn.dataset.filter);
    applyGridAudit();
    };
    });
    }
    
    function applyGridAudit(){
    var grid=window.$&&$("#grid").data("kendoGrid");
    if(!grid){alert("Table loading, try again.");return}
    
    var filter=localStorage.getItem("uw-filter")||"all";
    
    /* Calculate counts from Kendo data model, ensuring accuracy regardless of current DOM filters */
    var rawData=grid.dataSource.data();
    var counts={all:0, "6":0, "8":0, "10":0, noadv:0};
    
    for(var i=0; i<rawData.length; i++){
    var item=rawData[i];
    counts.all++;
    
    var hasNoAdvisor=!item.AdvisorChair||item.AdvisorChair.toString().trim()==="";
    var admitYear=item.GradAdmitYr?parseInt(item.GradAdmitYr,10):NaN;
    var yearsAgo=!isNaN(admitYear)?currentYear-admitYear:null;
    
    if(hasNoAdvisor){counts.noadv++}
    if(yearsAgo!==null){
    if(yearsAgo>=6){counts["6"]++}
    if(yearsAgo>=8){counts["8"]++}
    if(yearsAgo>=10){counts["10"]++}
    }
    }
    
    /* Update button text and active state classes */
    var controlPanel=document.getElementById("uw-controls");
    if(controlPanel){
    controlPanel.querySelectorAll("button").forEach(function(btn){
    var f=btn.dataset.filter;
    var label=btn.dataset.label;
    btn.textContent=label+" (n = "+(counts[f]||0)+")";
    
    if(f===filter){
    btn.classList.add("active");
    }else{
    btn.classList.remove("active");
    }
    });
    }
    
    /* Format DOM rows */
    function formatRows(){
    grid.tbody.find("tr").each(function(){
    var row=$(this);
    var dataItem=grid.dataItem(row);
    if(!dataItem)return;
    
    /* reset */
    row.removeClass("ten-year-red");
    row.show();
    row.find(".uw-extra, .no-advisor-warn, .ten-year-warn").remove();
    
    var hasNoAdvisor=!dataItem.AdvisorChair||dataItem.AdvisorChair.toString().trim()==="";
    var admitYear=dataItem.GradAdmitYr?parseInt(dataItem.GradAdmitYr,10):NaN;
    var yearsAgo=!isNaN(admitYear)?currentYear-admitYear:null;
    
    /* Apply active filter to hide non-matching rows */
    if(filter==="6" && (yearsAgo===null || yearsAgo<6)){row.hide(); return}
    if(filter==="8" && (yearsAgo===null || yearsAgo<8)){row.hide(); return}
    if(filter==="10" && (yearsAgo===null || yearsAgo<10)){row.hide(); return}
    if(filter==="noadv" && !hasNoAdvisor){row.hide(); return}
    
    /* styling */
    var bgColor="";
    var isTen=false;
    
    if(yearsAgo!==null){
    if(yearsAgo<=5)bgColor="rgba(40,167,69,0.2)";
    else if(yearsAgo<=7)bgColor="rgba(255,193,7,0.2)";
    else if(yearsAgo<=9)bgColor="rgba(220,53,69,0.2)";
    else{bgColor="#FF0000";isTen=true}
    }
    
    row.css("background-color",bgColor||"");
    if(isTen){row.addClass("ten-year-red")}
    
    /* name cell */
    var nameCell=row.find("td").eq(0);
    
    /* append years */
    if(yearsAgo!==null){
    nameCell.append('<span class="uw-extra" title="Years in program: '+yearsAgo+'"> ('+yearsAgo+'y)</span>');
    }
    
    /* warnings */
    if(hasNoAdvisor){
    nameCell.append('<span class="no-advisor-warn" title="No advisor assigned"> ⚠️</span>');
    }
    
    /* compound */
    if(yearsAgo>=8 && hasNoAdvisor){
    nameCell.append('<span class="ten-year-warn" title="≥8 years AND no advisor"> 🚨🚨</span>');
    } else if(yearsAgo>=10){
    nameCell.append('<span class="ten-year-warn" title="≥10 years"> 🚨</span>');
    }
    
    });
    }
    
    formatRows();
    grid.unbind("dataBound",formatRows);
    grid.bind("dataBound",formatRows);
    }
    
    /* init */
    var attempts=0;
    var initInterval=setInterval(function(){
    var grid=window.$&&$("#grid").data("kendoGrid");
    if(grid&&grid.dataSource.data().length>0){
    clearInterval(initInterval);
    applyGridAudit();
    }
    if(++attempts>10){
    clearInterval(initInterval);
    applyGridAudit();
    }
    },500);
    
    })();