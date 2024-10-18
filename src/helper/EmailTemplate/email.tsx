export const RegistrationTemplate = (emailID: string, password: string) => {
  return `
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
	<!--[if (gte mso 9)|(IE)]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
	<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="format-detection" content="telephone=no">
	<meta name="format-detection" content="date=no">
	<meta name="format-detection" content="address=no">
	<meta name="format-detection" content="email=no">
	<title>Starto - All In One</title>
	<style type="text/css">
		body
		{
			margin: 0px !important;
			padding: 0px !important;
			display: block !important;
			min-width: 100% !important;
			width: 100% !important;
			-webkit-text-size-adjust: none;
			word-break: break-word;
		}
		table
		{
			border-spacing: 0;
			mso-table-lspace: 0pt;
			mso-table-rspace: 0pt;
		}
		table td
		{
			border-collapse: collapse;
		}
		strong
		{
			font-weight: bold !important;
		}
		td img
		{
			-ms-interpolation-mode: bicubic;
			display: block;
			width: auto;
			max-width: auto;
			height: auto;
			margin: auto;
			display: block !important;
			border: 0px !important;
		}
		td p
		{
			margin: 0 !important;
			padding: 0 !important;
			display: inline-block !important;
			font-family: inherit !important;
		}
		td a
		{
			text-decoration: none !important;
		}
		table.hide-desktop,
		tr.hide-desktop,
		td.hide-desktop,
		br.hide-desktop
		{
			display: none !important;
		}
		.ExternalClass
		{
			width: 100%;
		}
		.ExternalClass,
		.ExternalClass p,
		.ExternalClass span,
		.ExternalClass font,
		.ExternalClass td,
		.ExternalClass div
		{
			line-height: inherit;
		}
		.ReadMsgBody
		{
			width: 100%;
			background-color: #FFFFFF;
		}
		a[x-apple-data-detectors]
		{
			color: inherit !important;
			text-decoration: none !important;
			font-size: inherit !important;
			font-family: inherit !important;
			font-weight: inherit !important;
			line-height: inherit !important;
		}
		u+#body a
		{
			color: inherit;
			text-decoration: none;
			font-size: inherit;
			font-family: inherit;
			font-weight: inherit;
			line-height: inherit;
		}
		.undoreset a,
		.undoreset a:hover
		{
			text-decoration: none !important;
		}
		.yshortcuts a
		{
			border-bottom: none !important;
		}
		.ios-footer a
		{
			color: #aaaaaa !important;
			text-decoration: none;
		}
		.star:hover a,
		.star:hover~.star a
		{
			color: #FFCF0F !important;
		}
	</style>
	<style type="text/css">
		@font-face
		{
			font-family: 'Poppins';
			font-style: italic;
			font-weight: 400;
			src: local('Poppins Italic'), local('Poppins-Italic'), url(https://fonts.gstatic.com/s/poppins/v9/pxiGyp8kv8JHgFVrJJLucHtA.woff2) format('woff2');
		}
		@font-face
		{
			font-family: 'Poppins';
			font-style: italic;
			font-weight: 600;
			src: local('Poppins SemiBold Italic'), local('Poppins-SemiBoldItalic'), url(https://fonts.gstatic.com/s/poppins/v9/pxiDyp8kv8JHgFVrJJLmr19VF9eO.woff2) format('woff2');
		}
		@font-face
		{
			font-family: 'Poppins';
			font-style: normal;
			font-weight: 400;
			src: local('Poppins Regular'), local('Poppins-Regular'), url(https://fonts.gstatic.com/s/poppins/v9/pxiEyp8kv8JHgFVrJJfecg.woff2) format('woff2');
		}
		@font-face
		{
			font-family: 'Poppins';
			font-style: normal;
			font-weight: 600;
			src: local('Poppins SemiBold'), local('Poppins-SemiBold'), url(https://fonts.gstatic.com/s/poppins/v9/pxiByp8kv8JHgFVrLEj6Z1xlFQ.woff2) format('woff2');
		}
	</style>
	<style type="text/css"> </style>
	<style type="text/css">
		@media only screen and (max-width:600px)
		{
			td.img-responsive img
			{
				width: 100% !important;
				max-width: 100% !important;
				height: auto !important;
				margin: auto;
			}
			table.row
			{
				width: 100% !important;
				max-width: 100% !important;
			}
			table.left-float,
			td.left-float
			{
				float: left !important;
			}
			table.center-float,
			td.center-float
			{
				float: none !important;
			}
			table.right-float,
			td.right-float
			{
				float: right !important;
			}
			td.left-text
			{
				text-align: left !important;
			}
			td.center-text
			{
				text-align: center !important;
			}
			td.right-text
			{
				text-align: right !important;
			}
			td.container-padding
			{
				width: 100% !important;
				padding-left: 15px !important;
				padding-right: 15px !important;
			}
			table.hide-mobile,
			tr.hide-mobile,
			td.hide-mobile,
			br.hide-mobile
			{
				display: none !important;
			}
			table.hide-desktop,
			tr.hide-desktop,
			td.hide-desktop,
			br.hide-desktop
			{
				display: block !important;
			}
			td.menu-container
			{
				text-align: center !important;
			}
			td.autoheight
			{
				height: auto !important;
			}
			table.mobile-padding
			{
				margin: 15px 0 !important;
			}
			td.br-mobile-none br
			{
				display: none !important;
			}
		}
	</style>
</head>
<body style="mso-line-height-rule:exactly; word-break:break-word; -ms-text-size-adjust:100%; -webkit-text-size-adjust:100%; margin:0; padding:0; width:100%" width="100%">
	<center>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #f1f1f1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#4B7BEC" style="background-color: #ffffff;">
								<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
									<tr>
										<td align="center" class="container-padding">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
												<tr>
													<td  style="font-size: 10px; height: 10px; line-height: 10px;">&nbsp;</td>
												</tr>
												<tr>
													<td height="45" align="center" valign="middle" class="autoheight"><a href="https://www.vacationsaga.com/" style="text-decoration:none;border:0px;"><img src="https://editor.maool.com/images/uploads/644815/1677742438-Asset_16@72x.png" width="230" border="0" alt="logo" style="width: 230px; border: 0px; display: inline-block !important; border-radius: 0px;"></a></td>
												</tr>
												<tr>
													<td  style="font-size: 16px; height: 16px; line-height: 16px;">&nbsp;</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color:#F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#4B7BEC" style="background-color: #ff7628;">
								<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
									<tr>
										<td align="center" class="container-padding">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:100%;">
												<tr>
													<td  style="font-size: 4px; height: 4px; line-height: 4px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle" style="font-family:'Poppins', sans-serif;color:#FFFFFF;font-size:16px;line-height:26px;font-weight:600;letter-spacing:0.5px;padding:0;padding-bottom:5px;">We got your&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle" class="br-mobile-none" style="font-family:'Poppins', sans-serif;color:#FFFFFF;font-size:38px;line-height:48px;font-weight:400;letter-spacing:0px;">Pass Key</td>
												</tr>
												<tr>
													<td  style="font-size:15px;height:15px;line-height:15px;">&nbsp;</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color:#F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#4B7BEC" style="background-color: #ff7628;">
								<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
									<tr>
										<td align="center">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:100%;">
												<tr>
													<td align="center" valign="middle" class="img-responsive"><img src="https://editor.maool.com/images/starto/hero@notification-resetpassword.png" border="0" width="600" alt="Header" style="display:inline-block!important;border:0;width:600px;max-width:600px;"></td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
								<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
									<tr>
										<td align="center" class="container-padding">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
												<tr>
													<td  style="font-size: 0px; height: 0px; line-height: 0px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="left" valign="middle" style="font-family:'Poppins', sans-serif;color:#191919;font-size:18px;line-height:28px;font-weight:600;letter-spacing:0px;padding:0px;padding-bottom:20px;">Hi Owner,</td>
												</tr>
												<tr>
													<td align="left" valign="middle" style="font-family: Poppins, sans-serif; color: #595959; font-size: 16px; line-height: 26px; font-weight: 400; letter-spacing: 0px; padding: 0px 0px 40px;">Registration Successful<br><br>You can access your account from the credentials given below<br><br>User Email ID : ${emailID};<br>Password : ${password};<br><a href="https://www.vacationsaga.com/login" style="text-size-adjust: 100%; text-decoration: none; color: #f4a53d;">LOGIN HERE&nbsp;<br></a><br><br>For any support please mail us on support@vacationsaga.com</td>
												</tr>
												<tr>
													<td  style="font-size: 0px; height: 0px; line-height: 0px;">&nbsp;</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
								<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
									<tr>
										<td align="center" class="container-padding">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
												<tr>
													<td  style="font-size: 0px; height: 0px; line-height: 0px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="left" valign="middle" style="font-family:'Poppins', sans-serif;color:#191919;font-size:18px;line-height:28px;font-weight:600;letter-spacing:0px;">Thank You,</td>
												</tr>
												<tr>
													<td align="left" valign="middle" style="font-family:'Poppins', sans-serif;color:#595959;font-size:16px;line-height:26px;font-weight:400;letter-spacing:0px;">Team Vacation Saga</td>
												</tr>
												<tr>
													<td  style="font-size:15px;height:15px;line-height:15px;">&nbsp;</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
								<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
									<tr>
										<td align="center" class="container-padding">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
												<tr>
													<td  style="font-size:15px;height:15px;line-height:15px;">&nbsp;</td>
												</tr>
												<tr>
													<td style="background-color:#F1F1F1;font-size:1px;height:1px;line-height:1px;">&nbsp;</td>
												</tr>
												<tr>
													<td  style="font-size:15px;height:15px;line-height:15px;">&nbsp;</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
								<table width="520" border="0" cellpadding="0" cellspacing="0" align="center" class="row" style="width:520px;max-width:520px;">
									<tr>
										<td align="center" class="container-padding">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
												<tr>
													<td  style="font-size:40px;height:40px;line-height:40px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle" style="padding:0;padding-bottom:20px;">
														<table cellpadding="0" cellspacing="0" align="center" class="center-float" style="border:0;border-collapse:collapse;border-spacing:0;">
															<tr></tr>
														</table>
													</td>
												</tr>
												<tr>
													<td align="center" valign="middle" class="br-mobile-none" style="font-family:'Poppins', sans-serif;color:#595959;font-size:14px;line-height:24px;font-weight:400;letter-spacing:0px;padding:0;padding-bottom:20px;">&nbsp;Regards, Vacation Saga</td>
												</tr>
												<tr>
													<td align="center" valign="middle" class="center-text" style="font-family: Poppins, sans-serif; color: #494949; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px; padding: 0px 0px 30px;"><a href="https://www.vacationsaga.com/privacy-policy" data-color="Links" style="border: 0px; color: #353535; text-decoration: underline !important;">Privacy </a>&nbsp; &nbsp;<a href="https://www.vacationsaga.com/login" data-color="Links" style="border: 0px; color: #353535; text-decoration: underline !important;">Account </a>&nbsp; <u><a href="https://www.vacationsaga.com/contact" style="text-size-adjust: 100%; text-decoration: none; color: #353535;">C</a>ontact Us</u></td>
												</tr>
												<tr>
													<td align="center" valign="middle"><a href="https://www.vacationsaga.com/" style="text-decoration:none;border:0px;"><img src="https://editor.maool.com/images/uploads/644815/1677742252-vacation_saga_logo.png" width="40" border="0" alt="logo" style="width:40px;border:0px;display:inline!important;"></a></td>
												</tr>
												<tr>
													<td  style="font-size:40px;height:40px;line-height:40px;">&nbsp;</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</center>
</body>
</html>
`;
};

export const ResetPasswordTemplate = (hashedToken: string) => {
  return `
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
	<!--[if (gte mso 9)|(IE)]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
	<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="format-detection" content="telephone=no">
	<meta name="format-detection" content="date=no">
	<meta name="format-detection" content="address=no">
	<meta name="format-detection" content="email=no">
	<title>Starto - All In One</title>
	<style type="text/css">
		body
		{
			margin: 0px !important;
			padding: 0px !important;
			display: block !important;
			min-width: 100% !important;
			width: 100% !important;
			-webkit-text-size-adjust: none;
			word-break: break-word;
		}
		table
		{
			border-spacing: 0;
			mso-table-lspace: 0pt;
			mso-table-rspace: 0pt;
		}
		table td
		{
			border-collapse: collapse;
		}
		strong
		{
			font-weight: bold !important;
		}
		td img
		{
			-ms-interpolation-mode: bicubic;
			display: block;
			width: auto;
			max-width: auto;
			height: auto;
			margin: auto;
			display: block !important;
			border: 0px !important;
		}
		td p
		{
			margin: 0 !important;
			padding: 0 !important;
			display: inline-block !important;
			font-family: inherit !important;
		}
		td a
		{
			text-decoration: none !important;
		}
		table.hide-desktop,
		tr.hide-desktop,
		td.hide-desktop,
		br.hide-desktop
		{
			display: none !important;
		}
		.ExternalClass
		{
			width: 100%;
		}
		.ExternalClass,
		.ExternalClass p,
		.ExternalClass span,
		.ExternalClass font,
		.ExternalClass td,
		.ExternalClass div
		{
			line-height: inherit;
		}
		.ReadMsgBody
		{
			width: 100%;
			background-color: #FFFFFF;
		}
		a[x-apple-data-detectors]
		{
			color: inherit !important;
			text-decoration: none !important;
			font-size: inherit !important;
			font-family: inherit !important;
			font-weight: inherit !important;
			line-height: inherit !important;
		}
		u+#body a
		{
			color: inherit;
			text-decoration: none;
			font-size: inherit;
			font-family: inherit;
			font-weight: inherit;
			line-height: inherit;
		}
		.undoreset a,
		.undoreset a:hover
		{
			text-decoration: none !important;
		}
		.yshortcuts a
		{
			border-bottom: none !important;
		}
		.ios-footer a
		{
			color: #aaaaaa !important;
			text-decoration: none;
		}
		.star:hover a,
		.star:hover~.star a
		{
			color: #FFCF0F !important;
		}
	</style>
	<style type="text/css">
		@font-face
		{
			font-family: 'Poppins';
			font-style: italic;
			font-weight: 400;
			src: local('Poppins Italic'), local('Poppins-Italic'), url(https://fonts.gstatic.com/s/poppins/v9/pxiGyp8kv8JHgFVrJJLucHtA.woff2) format('woff2');
		}
		@font-face
		{
			font-family: 'Poppins';
			font-style: italic;
			font-weight: 600;
			src: local('Poppins SemiBold Italic'), local('Poppins-SemiBoldItalic'), url(https://fonts.gstatic.com/s/poppins/v9/pxiDyp8kv8JHgFVrJJLmr19VF9eO.woff2) format('woff2');
		}
		@font-face
		{
			font-family: 'Poppins';
			font-style: normal;
			font-weight: 400;
			src: local('Poppins Regular'), local('Poppins-Regular'), url(https://fonts.gstatic.com/s/poppins/v9/pxiEyp8kv8JHgFVrJJfecg.woff2) format('woff2');
		}
		@font-face
		{
			font-family: 'Poppins';
			font-style: normal;
			font-weight: 600;
			src: local('Poppins SemiBold'), local('Poppins-SemiBold'), url(https://fonts.gstatic.com/s/poppins/v9/pxiByp8kv8JHgFVrLEj6Z1xlFQ.woff2) format('woff2');
		}
	</style>
	<style type="text/css"> </style>
	<style type="text/css">
		@media only screen and (max-width:600px)
		{
			td.img-responsive img
			{
				width: 100% !important;
				max-width: 100% !important;
				height: auto !important;
				margin: auto;
			}
			table.row
			{
				width: 100% !important;
				max-width: 100% !important;
			}
			table.left-float,
			td.left-float
			{
				float: left !important;
			}
			table.center-float,
			td.center-float
			{
				float: none !important;
			}
			table.right-float,
			td.right-float
			{
				float: right !important;
			}
			td.left-text
			{
				text-align: left !important;
			}
			td.center-text
			{
				text-align: center !important;
			}
			td.right-text
			{
				text-align: right !important;
			}
			td.container-padding
			{
				width: 100% !important;
				padding-left: 15px !important;
				padding-right: 15px !important;
			}
			table.hide-mobile,
			tr.hide-mobile,
			td.hide-mobile,
			br.hide-mobile
			{
				display: none !important;
			}
			table.hide-desktop,
			tr.hide-desktop,
			td.hide-desktop,
			br.hide-desktop
			{
				display: block !important;
			}
			td.menu-container
			{
				text-align: center !important;
			}
			td.autoheight
			{
				height: auto !important;
			}
			table.mobile-padding
			{
				margin: 15px 0 !important;
			}
			td.br-mobile-none br
			{
				display: none !important;
			}
		}
	</style>
</head>
<body style="mso-line-height-rule:exactly; word-break:break-word; -ms-text-size-adjust:100%; -webkit-text-size-adjust:100%; margin:0; padding:0; width:100%" width="100%">
	<center>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #f1f1f1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#4B7BEC" style="background-color: #ffffff;">
								<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
									<tr>
										<td align="center" class="container-padding">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
												<tr>
													<td  style="font-size: 10px; height: 10px; line-height: 10px;">&nbsp;</td>
												</tr>
												<tr>
													<td height="45" align="center" valign="middle" class="autoheight"><a href="https://www.vacationsaga.com/" style="text-decoration:none;border:0px;"><img src="https://editor.maool.com/images/uploads/644815/1677742438-Asset_16@72x.png" width="230" border="0" alt="logo" style="width: 230px; border: 0px; display: inline-block !important; border-radius: 0px;"></a></td>
												</tr>
												<tr>
													<td  style="font-size: 16px; height: 16px; line-height: 16px;">&nbsp;</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color:#F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#4B7BEC" style="background-color: #ff7628;">
								<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
									<tr>
										<td align="center" class="container-padding">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:100%;">
												<tr>
													<td  style="font-size: 4px; height: 4px; line-height: 4px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle" style="font-family:'Poppins', sans-serif;color:#FFFFFF;font-size:16px;line-height:26px;font-weight:600;letter-spacing:0.5px;padding:0;padding-bottom:5px;">We got your&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle" class="br-mobile-none" style="font-family:'Poppins', sans-serif;color:#FFFFFF;font-size:38px;line-height:48px;font-weight:400;letter-spacing:0px;">Pass Key</td>
												</tr>
												<tr>
													<td  style="font-size:15px;height:15px;line-height:15px;">&nbsp;</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color:#F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#4B7BEC" style="background-color: #ff7628;">
								<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
									<tr>
										<td align="center">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:100%;">
												<tr>
													<td align="center" valign="middle" class="img-responsive"><img src="https://editor.maool.com/images/starto/hero@notification-resetpassword.png" border="0" width="600" alt="Header" style="display:inline-block!important;border:0;width:600px;max-width:600px;"></td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
								<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
									<tr>
										<td align="center" class="container-padding">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
												<tr>
													<td  style="font-size: 0px; height: 0px; line-height: 0px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="left" valign="middle" style="font-family:'Poppins', sans-serif;color:#191919;font-size:18px;line-height:28px;font-weight:600;letter-spacing:0px;padding:0px;padding-bottom:20px;">Hi Owner,</td>
												</tr>
												<tr>
													<td align="left" valign="middle" style="font-family: Poppins, sans-serif; color: #595959; font-size: 16px; line-height: 26px; font-weight: 400; letter-spacing: 0px; padding: 0px 0px 40px;">Looks like your forgot your password<br><br>
													 <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
                                                         To reset your password, please click the button below:
                                                    </p>
                                                    <table cellspacing="0" cellpadding="0" style="margin-top:  20px; margin-bottom: 20px;">
                                                    <tr>
                                                       <td align="center" width="300" height="40" bgcolor="#FF9800" style="border-radius: 5px;">
                                                      <a href="${process.env.NEXT_PUBLIC_URL}/authentication/resetpassword?token=${hashedToken}" 
                                                      target="_blank" 
                                                      style="font-size: 16px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 5px; border: 1px solid #FF9800; display: inline-block;">
                                                      Reset Your Password
                                                    </a>
                                                   </td>
    </tr>
  </table>
  <p style="font-family: Arial, sans-serif; font-size: 14px; color: #666;">
    If the button doesn't work, you can copy and paste this link into your browser:
    <br>
    <span style="color: #0066cc;">${process.env.NEXT_PUBLIC_URL}/resetpassword?token=${hashedToken}</span>
  </p>
													<br><br><br>For any support please mail us on support@vacationsaga.com</td>
												</tr>
												<tr>
													<td  style="font-size: 0px; height: 0px; line-height: 0px;">&nbsp;</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
								<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
									<tr>
										<td align="center" class="container-padding">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
												<tr>
													<td  style="font-size: 0px; height: 0px; line-height: 0px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="left" valign="middle" style="font-family:'Poppins', sans-serif;color:#191919;font-size:18px;line-height:28px;font-weight:600;letter-spacing:0px;">Thank You,</td>
												</tr>
												<tr>
													<td align="left" valign="middle" style="font-family:'Poppins', sans-serif;color:#595959;font-size:16px;line-height:26px;font-weight:400;letter-spacing:0px;">Team Vacation Saga</td>
												</tr>
												<tr>
													<td  style="font-size:15px;height:15px;line-height:15px;">&nbsp;</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
								<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
									<tr>
										<td align="center" class="container-padding">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
												<tr>
													<td  style="font-size:15px;height:15px;line-height:15px;">&nbsp;</td>
												</tr>
												<tr>
													<td style="background-color:#F1F1F1;font-size:1px;height:1px;line-height:1px;">&nbsp;</td>
												</tr>
												<tr>
													<td  style="font-size:15px;height:15px;line-height:15px;">&nbsp;</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
								<table width="520" border="0" cellpadding="0" cellspacing="0" align="center" class="row" style="width:520px;max-width:520px;">
									<tr>
										<td align="center" class="container-padding">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
												<tr>
													<td  style="font-size:40px;height:40px;line-height:40px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle" style="padding:0;padding-bottom:20px;">
														<table cellpadding="0" cellspacing="0" align="center" class="center-float" style="border:0;border-collapse:collapse;border-spacing:0;">
															<tr></tr>
														</table>
													</td>
												</tr>
												<tr>
													<td align="center" valign="middle" class="br-mobile-none" style="font-family:'Poppins', sans-serif;color:#595959;font-size:14px;line-height:24px;font-weight:400;letter-spacing:0px;padding:0;padding-bottom:20px;">&nbsp;Regards, Vacation Saga</td>
												</tr>
												<tr>
													<td align="center" valign="middle" class="center-text" style="font-family: Poppins, sans-serif; color: #494949; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px; padding: 0px 0px 30px;"><a href="https://www.vacationsaga.com/privacy-policy" data-color="Links" style="border: 0px; color: #353535; text-decoration: underline !important;">Privacy </a>&nbsp; &nbsp;<a href="https://www.vacationsaga.com/login" data-color="Links" style="border: 0px; color: #353535; text-decoration: underline !important;">Account </a>&nbsp; <u><a href="https://www.vacationsaga.com/contact" style="text-size-adjust: 100%; text-decoration: none; color: #353535;">C</a>ontact Us</u></td>
												</tr>
												<tr>
													<td align="center" valign="middle"><a href="https://www.vacationsaga.com/" style="text-decoration:none;border:0px;"><img src="https://editor.maool.com/images/uploads/644815/1677742252-vacation_saga_logo.png" width="40" border="0" alt="logo" style="width:40px;border:0px;display:inline!important;"></a></td>
												</tr>
												<tr>
													<td  style="font-size:40px;height:40px;line-height:40px;">&nbsp;</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</center>
</body>
</html>
`;
};

export const ForgotPassword = (email: string, resetPasswordLink: string) => {
  return `
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
	<!--[if (gte mso 9)|(IE)]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
	<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="format-detection" content="telephone=no">
	<meta name="format-detection" content="date=no">
	<meta name="format-detection" content="address=no">
	<meta name="format-detection" content="email=no">
	<title>Starto - All In One</title>
	<style type="text/css">
		body
		{
			margin: 0px !important;
			padding: 0px !important;
			display: block !important;
			min-width: 100% !important;
			width: 100% !important;
			-webkit-text-size-adjust: none;
			word-break: break-word;
		}
		table
		{
			border-spacing: 0;
			mso-table-lspace: 0pt;
			mso-table-rspace: 0pt;
		}
		table td
		{
			border-collapse: collapse;
		}
		strong
		{
			font-weight: bold !important;
		}
		td img
		{
			-ms-interpolation-mode: bicubic;
			display: block;
			width: auto;
			max-width: auto;
			height: auto;
			margin: auto;
			display: block !important;
			border: 0px !important;
		}
		td p
		{
			margin: 0 !important;
			padding: 0 !important;
			display: inline-block !important;
			font-family: inherit !important;
		}
		td a
		{
			text-decoration: none !important;
		}
		table.hide-desktop,
		tr.hide-desktop,
		td.hide-desktop,
		br.hide-desktop
		{
			display: none !important;
		}
		.ExternalClass
		{
			width: 100%;
		}
		.ExternalClass,
		.ExternalClass p,
		.ExternalClass span,
		.ExternalClass font,
		.ExternalClass td,
		.ExternalClass div
		{
			line-height: inherit;
		}
		.ReadMsgBody
		{
			width: 100%;
			background-color: #FFFFFF;
		}
		a[x-apple-data-detectors]
		{
			color: inherit !important;
			text-decoration: none !important;
			font-size: inherit !important;
			font-family: inherit !important;
			font-weight: inherit !important;
			line-height: inherit !important;
		}
		u+#body a
		{
			color: inherit;
			text-decoration: none;
			font-size: inherit;
			font-family: inherit;
			font-weight: inherit;
			line-height: inherit;
		}
		.undoreset a,
		.undoreset a:hover
		{
			text-decoration: none !important;
		}
		.yshortcuts a
		{
			border-bottom: none !important;
		}
		.ios-footer a
		{
			color: #aaaaaa !important;
			text-decoration: none;
		}
		.star:hover a,
		.star:hover~.star a
		{
			color: #FFCF0F !important;
		}
	</style>
	<style type="text/css">
		@font-face
		{
			font-family: 'Poppins';
			font-style: italic;
			font-weight: 400;
			src: local('Poppins Italic'), local('Poppins-Italic'), url(https://fonts.gstatic.com/s/poppins/v9/pxiGyp8kv8JHgFVrJJLucHtA.woff2) format('woff2');
		}
		@font-face
		{
			font-family: 'Poppins';
			font-style: italic;
			font-weight: 600;
			src: local('Poppins SemiBold Italic'), local('Poppins-SemiBoldItalic'), url(https://fonts.gstatic.com/s/poppins/v9/pxiDyp8kv8JHgFVrJJLmr19VF9eO.woff2) format('woff2');
		}
		@font-face
		{
			font-family: 'Poppins';
			font-style: normal;
			font-weight: 400;
			src: local('Poppins Regular'), local('Poppins-Regular'), url(https://fonts.gstatic.com/s/poppins/v9/pxiEyp8kv8JHgFVrJJfecg.woff2) format('woff2');
		}
		@font-face
		{
			font-family: 'Poppins';
			font-style: normal;
			font-weight: 600;
			src: local('Poppins SemiBold'), local('Poppins-SemiBold'), url(https://fonts.gstatic.com/s/poppins/v9/pxiByp8kv8JHgFVrLEj6Z1xlFQ.woff2) format('woff2');
		}
	</style>
	<style type="text/css"> </style>
	<style type="text/css">
		@media only screen and (max-width:600px)
		{
			td.img-responsive img
			{
				width: 100% !important;
				max-width: 100% !important;
				height: auto !important;
				margin: auto;
			}
			table.row
			{
				width: 100% !important;
				max-width: 100% !important;
			}
			table.left-float,
			td.left-float
			{
				float: left !important;
			}
			table.center-float,
			td.center-float
			{
				float: none !important;
			}
			table.right-float,
			td.right-float
			{
				float: right !important;
			}
			td.left-text
			{
				text-align: left !important;
			}
			td.center-text
			{
				text-align: center !important;
			}
			td.right-text
			{
				text-align: right !important;
			}
			td.container-padding
			{
				width: 100% !important;
				padding-left: 15px !important;
				padding-right: 15px !important;
			}
			table.hide-mobile,
			tr.hide-mobile,
			td.hide-mobile,
			br.hide-mobile
			{
				display: none !important;
			}
			table.hide-desktop,
			tr.hide-desktop,
			td.hide-desktop,
			br.hide-desktop
			{
				display: block !important;
			}
			td.menu-container
			{
				text-align: center !important;
			}
			td.autoheight
			{
				height: auto !important;
			}
			table.mobile-padding
			{
				margin: 15px 0 !important;
			}
			td.br-mobile-none br
			{
				display: none !important;
			}
		}
	</style>
</head>
<body style="mso-line-height-rule:exactly; word-break:break-word; -ms-text-size-adjust:100%; -webkit-text-size-adjust:100%; margin:0; padding:0; width:100%" width="100%">
	<center>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #f1f1f1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#4B7BEC" style="background-color: #ffffff;">
								<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
									<tr>
										<td align="center" class="container-padding">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
												<tr>
													<td  style="font-size: 10px; height: 10px; line-height: 10px;">&nbsp;</td>
												</tr>
												<tr>
													<td height="45" align="center" valign="middle" class="autoheight"><a href="https://www.vacationsaga.com/" style="text-decoration:none;border:0px;"><img src="https://editor.maool.com/images/uploads/644815/1677742438-Asset_16@72x.png" width="230" border="0" alt="logo" style="width: 230px; border: 0px; display: inline-block !important; border-radius: 0px;"></a></td>
												</tr>
												<tr>
													<td  style="font-size: 16px; height: 16px; line-height: 16px;">&nbsp;</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color:#F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#4B7BEC" style="background-color: #ff7628;">
								<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
									<tr>
										<td align="center" class="container-padding">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:100%;">
												<tr>
													<td  style="font-size: 4px; height: 4px; line-height: 4px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle" style="font-family:'Poppins', sans-serif;color:#FFFFFF;font-size:16px;line-height:26px;font-weight:600;letter-spacing:0.5px;padding:0;padding-bottom:5px;">We got your&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle" class="br-mobile-none" style="font-family:'Poppins', sans-serif;color:#FFFFFF;font-size:38px;line-height:48px;font-weight:400;letter-spacing:0px;">Pass Key</td>
												</tr>
												<tr>
													<td  style="font-size:15px;height:15px;line-height:15px;">&nbsp;</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color:#F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#4B7BEC" style="background-color: #ff7628;">
								<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
									<tr>
										<td align="center">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:100%;">
												<tr>
													<td align="center" valign="middle" class="img-responsive"><img src="https://editor.maool.com/images/starto/hero@notification-resetpassword.png" border="0" width="600" alt="Header" style="display:inline-block!important;border:0;width:600px;max-width:600px;"></td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
								<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
									<tr>
										<td align="center" class="container-padding">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
												<tr>
													<td  style="font-size: 0px; height: 0px; line-height: 0px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="left" valign="middle" style="font-family:'Poppins', sans-serif;color:#191919;font-size:18px;line-height:28px;font-weight:600;letter-spacing:0px;padding:0px;padding-bottom:20px;">Hi Owner,</td>
												</tr>
												<tr>
												 "${resetPasswordLink}"
												</tr>
												<tr>
													<td align="left" valign="middle" style="font-family: Poppins, sans-serif; color: #595959; font-size: 16px; line-height: 26px; font-weight: 400; letter-spacing: 0px; padding: 0px 0px 40px;">Registration Successful<br><br>You can access your account from the credentials given below<br><br>Reset Password Link :&nbsp;<br>Password : 6473<br><a href="{resetPasswordLink}" style="text-size-adjust: 100%; text-decoration: none; color: #f4a53d;">Reset Your Password &nbsp;<br></a><br><br>For any support please mail us on support@vacationsaga.com</td>
												</tr>
												<tr>
													<td  style="font-size: 0px; height: 0px; line-height: 0px;">&nbsp;</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
								<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
									<tr>
										<td align="center" class="container-padding">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
												<tr>
													<td  style="font-size: 0px; height: 0px; line-height: 0px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="left" valign="middle" style="font-family:'Poppins', sans-serif;color:#191919;font-size:18px;line-height:28px;font-weight:600;letter-spacing:0px;">Thank You,</td>
												</tr>
												<tr>
													<td align="left" valign="middle" style="font-family:'Poppins', sans-serif;color:#595959;font-size:16px;line-height:26px;font-weight:400;letter-spacing:0px;">Team Vacation Saga</td>
												</tr>
												<tr>
													<td  style="font-size:15px;height:15px;line-height:15px;">&nbsp;</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
								<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
									<tr>
										<td align="center" class="container-padding">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
												<tr>
													<td  style="font-size:15px;height:15px;line-height:15px;">&nbsp;</td>
												</tr>
												<tr>
													<td style="background-color:#F1F1F1;font-size:1px;height:1px;line-height:1px;">&nbsp;</td>
												</tr>
												<tr>
													<td  style="font-size:15px;height:15px;line-height:15px;">&nbsp;</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
								<table width="520" border="0" cellpadding="0" cellspacing="0" align="center" class="row" style="width:520px;max-width:520px;">
									<tr>
										<td align="center" class="container-padding">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
												<tr>
													<td  style="font-size:40px;height:40px;line-height:40px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle" style="padding:0;padding-bottom:20px;">
														<table cellpadding="0" cellspacing="0" align="center" class="center-float" style="border:0;border-collapse:collapse;border-spacing:0;">
															<tr></tr>
														</table>
													</td>
												</tr>
												<tr>
													<td align="center" valign="middle" class="br-mobile-none" style="font-family:'Poppins', sans-serif;color:#595959;font-size:14px;line-height:24px;font-weight:400;letter-spacing:0px;padding:0;padding-bottom:20px;">&nbsp;Regards, Vacation Saga</td>
												</tr>
												<tr>
													<td align="center" valign="middle" class="center-text" style="font-family: Poppins, sans-serif; color: #494949; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px; padding: 0px 0px 30px;"><a href="https://www.vacationsaga.com/privacy-policy" data-color="Links" style="border: 0px; color: #353535; text-decoration: underline !important;">Privacy </a>&nbsp; &nbsp;<a href="https://www.vacationsaga.com/login" data-color="Links" style="border: 0px; color: #353535; text-decoration: underline !important;">Account </a>&nbsp; <u><a href="https://www.vacationsaga.com/contact" style="text-size-adjust: 100%; text-decoration: none; color: #353535;">C</a>ontact Us</u></td>
												</tr>
												<tr>
													<td align="center" valign="middle"><a href="https://www.vacationsaga.com/" style="text-decoration:none;border:0px;"><img src="https://editor.maool.com/images/uploads/644815/1677742252-vacation_saga_logo.png" width="40" border="0" alt="logo" style="width:40px;border:0px;display:inline!important;"></a></td>
												</tr>
												<tr>
													<td  style="font-size:40px;height:40px;line-height:40px;">&nbsp;</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</center>
</body>
</html>
`;
};

export const VerificationTemplate = (
  hashedToken: string,
  password: string,
  email: string
) => {
  return `
	<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
	<head>
		<!--[if (gte mso 9)|(IE)]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
		<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="format-detection" content="telephone=no">
		<meta name="format-detection" content="date=no">
		<meta name="format-detection" content="address=no">
		<meta name="format-detection" content="email=no">
		<title>Starto - All In One</title>
		<style type="text/css">
			body
			{
				margin: 0px !important;
				padding: 0px !important;
				display: block !important;
				min-width: 100% !important;
				width: 100% !important;
				-webkit-text-size-adjust: none;
				word-break: break-word;
			}
			table
			{
				border-spacing: 0;
				mso-table-lspace: 0pt;
				mso-table-rspace: 0pt;
			}
			table td
			{
				border-collapse: collapse;
			}
			strong
			{
				font-weight: bold !important;
			}
			td img
			{
				-ms-interpolation-mode: bicubic;
				display: block;
				width: auto;
				max-width: auto;
				height: auto;
				margin: auto;
				display: block !important;
				border: 0px !important;
			}
			td p
			{
				margin: 0 !important;
				padding: 0 !important;
				display: inline-block !important;
				font-family: inherit !important;
			}
			td a
			{
				text-decoration: none !important;
			}
			table.hide-desktop,
			tr.hide-desktop,
			td.hide-desktop,
			br.hide-desktop
			{
				display: none !important;
			}
			.ExternalClass
			{
				width: 100%;
			}
			.ExternalClass,
			.ExternalClass p,
			.ExternalClass span,
			.ExternalClass font,
			.ExternalClass td,
			.ExternalClass div
			{
				line-height: inherit;
			}
			.ReadMsgBody
			{
				width: 100%;
				background-color: #FFFFFF;
			}
			a[x-apple-data-detectors]
			{
				color: inherit !important;
				text-decoration: none !important;
				font-size: inherit !important;
				font-family: inherit !important;
				font-weight: inherit !important;
				line-height: inherit !important;
			}
			u+#body a
			{
				color: inherit;
				text-decoration: none;
				font-size: inherit;
				font-family: inherit;
				font-weight: inherit;
				line-height: inherit;
			}
			.undoreset a,
			.undoreset a:hover
			{
				text-decoration: none !important;
			}
			.yshortcuts a
			{
				border-bottom: none !important;
			}
			.ios-footer a
			{
				color: #aaaaaa !important;
				text-decoration: none;
			}
			.star:hover a,
			.star:hover~.star a
			{
				color: #FFCF0F !important;
			}
		</style>
		<style type="text/css">
			@font-face
			{
				font-family: 'Poppins';
				font-style: italic;
				font-weight: 400;
				src: local('Poppins Italic'), local('Poppins-Italic'), url(https://fonts.gstatic.com/s/poppins/v9/pxiGyp8kv8JHgFVrJJLucHtA.woff2) format('woff2');
			}
			@font-face
			{
				font-family: 'Poppins';
				font-style: italic;
				font-weight: 600;
				src: local('Poppins SemiBold Italic'), local('Poppins-SemiBoldItalic'), url(https://fonts.gstatic.com/s/poppins/v9/pxiDyp8kv8JHgFVrJJLmr19VF9eO.woff2) format('woff2');
			}
			@font-face
			{
				font-family: 'Poppins';
				font-style: normal;
				font-weight: 400;
				src: local('Poppins Regular'), local('Poppins-Regular'), url(https://fonts.gstatic.com/s/poppins/v9/pxiEyp8kv8JHgFVrJJfecg.woff2) format('woff2');
			}
			@font-face
			{
				font-family: 'Poppins';
				font-style: normal;
				font-weight: 600;
				src: local('Poppins SemiBold'), local('Poppins-SemiBold'), url(https://fonts.gstatic.com/s/poppins/v9/pxiByp8kv8JHgFVrLEj6Z1xlFQ.woff2) format('woff2');
			}
		</style>
		<style type="text/css"> </style>
		<style type="text/css">
			@media only screen and (max-width:600px)
			{
				td.img-responsive img
				{
					width: 100% !important;
					max-width: 100% !important;
					height: auto !important;
					margin: auto;
				}
				table.row
				{
					width: 100% !important;
					max-width: 100% !important;
				}
				table.left-float,
				td.left-float
				{
					float: left !important;
				}
				table.center-float,
				td.center-float
				{
					float: none !important;
				}
				table.right-float,
				td.right-float
				{
					float: right !important;
				}
				td.left-text
				{
					text-align: left !important;
				}
				td.center-text
				{
					text-align: center !important;
				}
				td.right-text
				{
					text-align: right !important;
				}
				td.container-padding
				{
					width: 100% !important;
					padding-left: 15px !important;
					padding-right: 15px !important;
				}
				table.hide-mobile,
				tr.hide-mobile,
				td.hide-mobile,
				br.hide-mobile
				{
					display: none !important;
				}
				table.hide-desktop,
				tr.hide-desktop,
				td.hide-desktop,
				br.hide-desktop
				{
					display: block !important;
				}
				td.menu-container
				{
					text-align: center !important;
				}
				td.autoheight
				{
					height: auto !important;
				}
				table.mobile-padding
				{
					margin: 15px 0 !important;
				}
				td.br-mobile-none br
				{
					display: none !important;
				}
			}
		</style>
	</head>
	<body style="mso-line-height-rule:exactly; word-break:break-word; -ms-text-size-adjust:100%; -webkit-text-size-adjust:100%; margin:0; padding:0; width:100%" width="100%">
		<center>
			<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
				<tr>
					<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #f1f1f1;">
						<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
							<tr>
								<td align="center" bgcolor="#4B7BEC" style="background-color: #ffffff;">
									<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
										<tr>
											<td align="center" class="container-padding">
												<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
													<tr>
														<td  style="font-size: 10px; height: 10px; line-height: 10px;">&nbsp;</td>
													</tr>
													<tr>
														<td height="45" align="center" valign="middle" class="autoheight"><a href="https://www.vacationsaga.com/" style="text-decoration:none;border:0px;"><img src="https://editor.maool.com/images/uploads/644815/1677742438-Asset_16@72x.png" width="230" border="0" alt="logo" style="width: 230px; border: 0px; display: inline-block !important; border-radius: 0px;"></a></td>
													</tr>
													<tr>
														<td  style="font-size: 16px; height: 16px; line-height: 16px;">&nbsp;</td>
													</tr>
												</table>
											</td>
										</tr>
									</table>
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
			<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
				<tr>
					<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color:#F1F1F1;">
						<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
							<tr>
								<td align="center" bgcolor="#4B7BEC" style="background-color: #ff7628;">
									<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
										<tr>
											<td align="center" class="container-padding">
												<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:100%;">
													<tr>
														<td  style="font-size: 4px; height: 4px; line-height: 4px;">&nbsp;</td>
													</tr>
													<tr>
														<td align="center" valign="middle" style="font-family:'Poppins', sans-serif;color:#FFFFFF;font-size:16px;line-height:26px;font-weight:600;letter-spacing:0.5px;padding:0;padding-bottom:5px;">We got your&nbsp;</td>
													</tr>
													<tr>
														<td align="center" valign="middle" class="br-mobile-none" style="font-family:'Poppins', sans-serif;color:#FFFFFF;font-size:38px;line-height:48px;font-weight:400;letter-spacing:0px;">Pass Key</td>
													</tr>
													<tr>
														<td  style="font-size:15px;height:15px;line-height:15px;">&nbsp;</td>
													</tr>
												</table>
											</td>
										</tr>
									</table>
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
			<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
				<tr>
					<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color:#F1F1F1;">
						<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
							<tr>
								<td align="center" bgcolor="#4B7BEC" style="background-color: #ff7628;">
									<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
										<tr>
											<td align="center">
												<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:100%;">
													<tr>
														<td align="center" valign="middle" class="img-responsive"><img src="https://editor.maool.com/images/starto/hero@notification-resetpassword.png" border="0" width="600" alt="Header" style="display:inline-block!important;border:0;width:600px;max-width:600px;"></td>
													</tr>
												</table>
											</td>
										</tr>
									</table>
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
			<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
				<tr>
					<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
						<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
							<tr>
								<td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
									<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
										<tr>
											<td align="center" class="container-padding">
												<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
													<tr>
														<td  style="font-size: 0px; height: 0px; line-height: 0px;">&nbsp;</td>
													</tr>
													<tr>
														<td align="left" valign="middle" style="font-family:'Poppins', sans-serif;color:#191919;font-size:18px;line-height:28px;font-weight:600;letter-spacing:0px;padding:0px;padding-bottom:20px;">Hi Owner,</td>
													</tr>
													<tr>
														<td align="left" valign="middle" style="font-family: Poppins, sans-serif; color: #595959; font-size: 16px; line-height: 26px; font-weight: 400; letter-spacing: 0px; padding: 0px 0px 40px;">Registration Successful<br><br>You can access your account from the credentials given below<br>
														<br>Password:"${password}"<br>
														<br>
													    </br>
														<br>For any support please mail us on support@vacationsaga.com</td>
                                                        <br>  
													</tr>
													<tr>
														<td  style="font-size: 0px; height: 0px; line-height: 0px;">&nbsp;</td>
													</tr>
												</table>
											</td>
										</tr>
									</table>
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
			<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
				<tr>
					<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
						<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
							<tr>
								<td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
									<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
										<tr>
											<td align="center" class="container-padding">
												<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
													<tr>
														<td  style="font-size: 0px; height: 0px; line-height: 0px;">&nbsp;</td>
													</tr>
													<tr>
														<td align="left" valign="middle" style="font-family:'Poppins', sans-serif;color:#191919;font-size:18px;line-height:28px;font-weight:600;letter-spacing:0px;">Thank You,</td>
													</tr>
													<tr>
														<td align="left" valign="middle" style="font-family:'Poppins', sans-serif;color:#595959;font-size:16px;line-height:26px;font-weight:400;letter-spacing:0px;">Team Vacation Saga</td>
													</tr>
													<tr>
														<td  style="font-size:15px;height:15px;line-height:15px;">&nbsp;</td>
													</tr>
												</table>
											</td>
										</tr>
									</table>
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
			<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
				<tr>
					<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
						<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
							<tr>
								<td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
									<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
										<tr>
											<td align="center" class="container-padding">
												<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
													<tr>
														<td  style="font-size:15px;height:15px;line-height:15px;">&nbsp;</td>
													</tr>
													<tr>
														<td style="background-color:#F1F1F1;font-size:1px;height:1px;line-height:1px;">&nbsp;</td>
													</tr>
													<tr>
														<td  style="font-size:15px;height:15px;line-height:15px;">&nbsp;</td>
													</tr>
												</table>
											</td>
										</tr>
									</table>
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
			<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;">
				<tr>
					<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
						<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
							<tr>
								<td align="center" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
									<table width="520" border="0" cellpadding="0" cellspacing="0" align="center" class="row" style="width:520px;max-width:520px;">
										<tr>
											<td align="center" class="container-padding">
												<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
													<tr>
														<td  style="font-size:40px;height:40px;line-height:40px;">&nbsp;</td>
													</tr>
													<tr>
														<td align="center" valign="middle" style="padding:0;padding-bottom:20px;">
															<table cellpadding="0" cellspacing="0" align="center" class="center-float" style="border:0;border-collapse:collapse;border-spacing:0;">
																<tr></tr>
															</table>
														</td>
													</tr>
													<tr>
														<td align="center" valign="middle" class="br-mobile-none" style="font-family:'Poppins', sans-serif;color:#595959;font-size:14px;line-height:24px;font-weight:400;letter-spacing:0px;padding:0;padding-bottom:20px;">&nbsp;Regards, Vacation Saga</td>
													</tr>
													<tr>
														<td align="center" valign="middle" class="center-text" style="font-family: Poppins, sans-serif; color: #494949; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px; padding: 0px 0px 30px;"><a href="https://www.vacationsaga.com/privacy-policy" data-color="Links" style="border: 0px; color: #353535; text-decoration: underline !important;">Privacy </a>&nbsp; &nbsp;<a href="https://www.vacationsaga.com/login" data-color="Links" style="border: 0px; color: #353535; text-decoration: underline !important;">Account </a>&nbsp; <u><a href="https://www.vacationsaga.com/contact" style="text-size-adjust: 100%; text-decoration: none; color: #353535;">C</a>ontact Us</u></td>
													</tr>
													<tr>
														<td align="center" valign="middle"><a href="https://www.vacationsaga.com/" style="text-decoration:none;border:0px;"><img src="https://editor.maool.com/images/uploads/644815/1677742252-vacation_saga_logo.png" width="40" border="0" alt="logo" style="width:40px;border:0px;display:inline!important;"></a></td>
													</tr>
													<tr>
														<td  style="font-size:40px;height:40px;line-height:40px;">&nbsp;</td>
													</tr>
												</table>
											</td>
										</tr>
									</table>
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
		</center>
	</body>
	</html>
	`;
};
// Temp work will start from here...

export const NewPasswordTemplate = (newPassword: string) => {
  return `
	 <!DOCTYPE html>
  <html lang="en">
   <head>
     <meta charset="UTF-8" />
     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
     <title>Your New Password</title>
      <style>
        body {
        font-family: Arial, sans-serif;
        line-height: 1.8;
        color: #333;
        background-color: #f9f9f9;
        margin: 0;
        padding: 0;
      }
      .container {
        width: 100%;
        max-width: 600px;
        margin: 40px auto;
        padding: 20px;
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      .header {
        background-color: #F29522;
        color: #fff;
        padding: 20px;
        text-align: center;
        border-radius: 8px 8px 0 0;
      }
      .header h1 {
        margin: 0;
        font-size: 1.5em;
      }
      .content {
        padding: 20px;
        text-align: center;
      }
      .password {
        font-size: 1.4em;
        font-weight: bold;
        background-color: #f4f4f4;
        padding: 15px;
        border-radius: 6px;
        color: #333;
        letter-spacing: 2px;
        margin: 20px 0;
      }
      .note {
        font-size: 0.95em;
        color: #555;
        margin-top: 20px;
      }
		.notetwo {
        font-size: 0.95em;
        color: #555;
        margin-top: 20px;
		text-align: start;
      }
      .footer {
        background-color: #f4f4f4;
        padding: 15px;
        text-align: center;
        font-size: 0.85em;
        color: #777;
        border-radius: 0 0 8px 8px;
      }
      .footer p {
        margin: 5px 0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <!-- Header Section -->
      <div class="header">
        <h1>Password Reset Successful</h1>
      </div>

      <!-- Content Section -->
      <div class="content">
        <p>Hello there!</p>
        <p>
          A new password has been generated for your account. For security
          purposes, please use the following password to log in:
        </p>

        <div class="password">${newPassword}</div>

		 <p class="note">
         After logging in, your current password will expire in 24 hours. To access your account after that, please contact the administrator to request a new password.
        </p>

        <p class="note">
          If you did not request this password change, please contact your
          administrator immediately to ensure the security of your account.
        </p>
		 <p class="notetwo">
           Have a nice day !!
        </p>
      </div>

      <!-- Footer Section -->
      <div class="footer">
        <p>
          This is an automated message. Please do not reply.
        </p>
        <p>Thank you for using our services. Stay safe!</p>
      </div>
    </div>
  </body>
</html>

	`;
};

export const OtpTemplate = (otp: number) => {
  return `
		
 <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>OTP Verification</title>

    <link
      href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap"
      rel="stylesheet"
    />
  </head>
  <body
    style="
      margin: 0;
      font-family: 'Poppins', sans-serif;
      background: #f8f8f8;
      font-size: 16px;
      color: #434343;
    "
  >
    <div
      style="
        max-width: 600px;
        margin: 0 auto;
        padding: 45px 30px;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.05);
      "
    >
      <!-- Header Section -->
      <header style="text-align: center; padding-bottom: 20px">
        <img
          src="https://vacationsaga.b-cdn.net/logo-removedBg.png"
          alt="VacationSaga Logo"
          style="max-width: 150px"
        />
        <h2
          style="
            font-size: 24px;
            font-weight: 600;
            color: #f7941d;
            margin-top: 20px;
          "
        >
          OTP Verification
        </h2>
        <p
          style="
            font-size: 16px;
            color: #434343;
            margin: 5px 0;
            font-weight: 400;
          "
        >
          Secure your account with the provided One-Time Password (OTP).
        </p>
      </header>

      <!-- OTP Section -->
      <section
        style="
          background: #f7f9fc;
          padding: 30px;
          border-radius: 12px;
          text-align: center;
          margin-bottom: 30px;
        "
      >
        <p style="margin: 10px 0 20px; font-size: 16px; font-weight: 400">
          We have generated an OTP for you to log in to your SuperAdmin account.
          Please use the OTP below to proceed. For security reasons, the OTP
          will expire in 10 minutes.
        </p>

        <div
          style="
            background: #fef6e9;
            padding: 20px;
            border-radius: 8px;
            display: inline-block;
            margin-top: 20px;
            font-size: 32px;
            font-weight: 700;
            letter-spacing: 12px;
            color: #f7941d;
          "
        >
          ${otp}
        </div>

        <p
          style="
            font-size: 14px;
            margin-top: 20px;
            color: #888888;
            font-weight: 400;
          "
        >
          Please do not share this OTP with anyone.
        </p>
      </section>

      <!-- Help Section -->
      <section
        style="
          text-align: center;
          margin-bottom: 30px;
          font-size: 14px;
          color: #888888;
        "
      >
        <p style="font-weight: 500; margin: 0 0 10px">
          Need help or have questions?
        </p>
        <p style="margin: 0 0 10px">
          Contact our support team at
          <a
            href="mailto:info@vacationsaga.com"
            style="color: #f7941d; text-decoration: none; font-weight: 500"
            >info@vacationsaga.com</a
          >.
        </p>
        <p style="margin: 0">
          Visit our
          <a
            href="#"
            target="_blank"
            style="color: #f7941d; text-decoration: none; font-weight: 500"
            >Help Center</a
          >
          for more information.
        </p>
      </section>

      <!-- Footer Section -->
      <footer
        style="
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #eaeaea;
          font-size: 14px;
          color: #888888;
        "
      >
        <p style="margin: 0">© 2024 VacationSaga. All rights reserved.</p>
        <p style="margin-top: 5px">
          VacationSaga, 123 Main St, Suite 500, City, Country
        </p>
      </footer>
    </div>
  </body>
</html>


	  `;
};
