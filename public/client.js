/*
This needs to be split up to different files or at some point served with webpack
*/


if (!localStorage.getItem("acceptedCookies")) {
  $("#modalcookies").modal("show");
  localStorage.setItem("acceptedCookies", true);
}
$('#reg').submit(function(event) {
  $("#captchaFailure").hide();
  $("#registerFailure").hide();
  $("#passwordFailure").hide();
  $("#passwordWarning").hide();
  $("#passwordSuggestions").hide();
  event.preventDefault();
  if (grecaptcha.getResponse().length > 0) {
    let analyze = zxcvbn($('#register-password').val());
    if (analyze.score > 2) {
      $.post('/reg?' + $.param({username: $('#register-username').val(), password: $('#register-password').val(), email: $('#register-email').val(), description: $('#register-description').val()}), function(r) {
        if (r.success) {
          window.location.assign(`/profile/${r.id}`);
        } else {
          $("#registerFailure").show();
        }
      });
    } else {
      $("#passwordFailure").show();
      if (analyze.feedback.warning.length > 0) {
        $("#passwordWarning").show();
        $("#passwordWarning").html(`${analyze.feedback.warning}.`);
      }
      if (analyze.feedback.suggestions.length > 0) {
        $("#passwordSuggestions").show();
        $("#passwordSuggestions").html(analyze.feedback.suggestions.join(""));
      }
    }
  } else {
    $("#captchaFailure").show();
    grecaptcha.reset()
  }
});

$('#logi').submit(function(event) {
  $("#loginFailure").hide();
  $("#captchaFailure").hide();
  event.preventDefault();
  if (($("#loginCaptcha").css("display") != "block") || (grecaptcha.getResponse().length > 0)) {
    $.post('/login?' + $.param({username: $('#login-username').val(), password: $('#login-password').val()}), function(r) {
      if (r.success) {
        window.location.assign("/");
      } else {
        console.log(r);
        if (r.failedattempts > 3) {
          $("#loginCaptcha").show();
        }
        $("#loginFailure").show();
      }
    });
  } else {
    $("#captchaFailure").show();
    grecaptcha.reset()
  }
});

$('#updateProfile').submit(function(event) {
  event.preventDefault();
  var description = $('#settings-description').val();
  var picture = $('#settings-picture').val();
  console.log({description: description, picture: picture});
  console.log('/updateProfile?' + $.param({description: description, picture: picture}));
  $.post('/updateProfile?' + $.param({description: description, picture: picture}), function(r) {
    window.location.assign(r);
  });
});

$('#tutorialForm').submit(function(event) {
  event.preventDefault();
  $.post('/tutorials?' + $.param({title: $('#tutorials-topic').val(), description: $('#tutorials-description').val(), content: $('#tutorials-content').val()}), function(r) {
    if (r) {
      window.location.assign(`/tutorials/${r}`);
    } else {
      window.location.assign(`/`);
    }
  });
});

$('.panel-img-div > img').on('click',function(){
  var src = $(this).attr('src');
  var img = '<img src="' + src + '" class="img-fluid"/>';

  $('#screenshot').modal();
  $('#screenshot').on('shown.bs.modal', function(){
    $('#screenshot .modal-body').html(img);
  });
  $('#screenshot').on('hidden.bs.modal', function(){
    $('#screenshot .modal-body').html('');
  });
});
let newDoc = (x) => {
  window.location.assign(x)
}
let modalFire = (a) => {
  $("#modal"+a).modal();
}