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

/* High-contrast Husky panel */
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
  width:140px;
  box-shadow:0 4px 10px rgba(0,0,0,0.4);
}

#uw-controls .title {
  font-weight:bold;
  margin-bottom:6px;
  text-align:center;
}

#uw-controls button {
  display:block;
  width:100%;
  margin:4px 0;
  padding:4px;
  border:none;
  border-radius:4px;
  background:#ffffff;
  color:#4b2e83;
  font-weight:bold;
  cursor:pointer;
}

#uw-controls button:hover {
  background:#e6e0f5;
}

/* dashboard */
#uw-dashboard {
  display:inline-block;
  margin-left:20px;
  padding:8px 10px;
  border:2px solid #4b2e83;
  border-radius:6px;
  background:#f7f5fb;
  color:#2c1b4f;
  font-size:12px;
  font-family:sans-serif;
}
`;
document.head.appendChild(style);
}

/* Create control panel */
if(!document.getElementById("uw-controls")){
var panel=document.createElement("div");
panel.id="uw-controls";
panel.innerHTML=`
<div class="title">Filter</div>
<button data-filter="all">All</button>
<button data-filter="6">≥ 6 years</button>
<button data-filter="8">≥ 8 years</button>
<button data-filter="10">≥ 10 years</button>
<button data-filter="noadv">No advisor</button>
`;
document.body.appendChild(panel);

panel.querySelectorAll("button").forEach(function(btn){
btn.onclick=function(){
localStorage.setItem("uw-filter",btn.dataset.filter);
applyGridAudit();
};
});
}

/* Create dashboard (robust anchor to grid toolbar) */
function renderDashboard(stats){
    var toolbar=document.querySelector(".k-grid-toolbar");
    var container=toolbar;
    
    /* Fallback: create dashboard container if toolbar doesn't exist */
    if(!container){
    container=document.getElementById("uw-dashboard-container");
    if(!container){
    container=document.createElement("div");
    container.id="uw-dashboard-container";
    container.style.cssText="position:fixed;top:120px;right:20px;z-index:9998;background:#f7f5fb;border:2px solid #4b2e83;border-radius:6px;padding:10px;font-family:sans-serif;font-size:12px;color:#2c1b4f;box-shadow:0 4px 10px rgba(0,0,0,0.2);";
    document.body.appendChild(container);
    }
    }
    
    var dash=document.getElementById("uw-dashboard");
    if(!dash){
    dash=document.createElement("div");
    dash.id="uw-dashboard";
    if(toolbar){
    /* Original behavior: append to toolbar */
    toolbar.appendChild(dash);
    }else{
    /* Fallback: use the container we created */
    container.appendChild(dash);
    }
    }
    
    dash.innerHTML=`
    <b>Summary</b><br>
    Total: ${stats.total}<br>
    ≤5y: ${stats.le5}<br>
    6–7y: ${stats.six7}<br>
    8–9y: ${stats.eight9}<br>
    ≥10y: ${stats.ten}<br>
    No advisor: ${stats.noAdv}
    `;
    }

function applyGridAudit(){
var grid=window.$&&$("#grid").data("kendoGrid");
if(!grid){alert("Table loading, try again.");return}

var filter=localStorage.getItem("uw-filter")||"all";

/* stats */
var stats={total:0,le5:0,six7:0,eight9:0,ten:0,noAdv:0};

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

/* stats */
stats.total++;
if(hasNoAdvisor)stats.noAdv++;

if(yearsAgo!==null){
if(yearsAgo<=5)stats.le5++;
else if(yearsAgo<=7)stats.six7++;
else if(yearsAgo<=9)stats.eight9++;
else stats.ten++;
}

/* filtering */
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
renderDashboard(stats);
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
