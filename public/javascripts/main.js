$(document).ready(function(){
  $("#submit").click(function(){
    $.post( "/signup", { name: "John", time: "2pm" } );
  });
});
