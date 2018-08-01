$(document).ready(function(){
    $('.drop-down__item').click(function(){
      $(this).closest("div").prev().find("span").html($(this).html());
    });
    $(document).click(function(e){
      if ($(e.target).hasClass('drop-down__button') || $(e.target).hasClass('drop-down__name')) {
        $('.drop-down').removeClass('drop-down--active');
        $(e.target).closest('.drop-down').toggleClass('drop-down--active');
      }
      if (!($(e.target).hasClass('drop-down__button')) && 
          !($(e.target).hasClass('drop-down__name')) && 
          $('.drop-down').hasClass('drop-down--active')) {
        $('.drop-down').removeClass('drop-down--active');
      }
    });
});