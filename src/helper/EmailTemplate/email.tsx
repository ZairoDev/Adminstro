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

export const TheTechTuneTemplate = (plan: string) => {
  return `
	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
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
	<title>Agency - All In One</title>
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
			background-color: #ffffff;
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
			font-style: italic;
			font-weight: 700;
			src: local('Poppins Bold Italic'), local('Poppins-BoldItalic'), url(https://fonts.gstatic.com/s/poppins/v9/pxiDyp8kv8JHgFVrJJLmy15VF9eO.woff2) format('woff2');
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
		@font-face
		{
			font-family: 'Poppins';
			font-style: normal;
			font-weight: 700;
			src: local('Poppins Bold'), local('Poppins-Bold'), url(https://fonts.gstatic.com/s/poppins/v9/pxiByp8kv8JHgFVrLCz7Z1xlFQ.woff2) format('woff2');
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
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
								<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
									<tr>
										<td align="center" class="container-padding" bgcolor="#ffffff" background="" style="background-color: #ffffff; background-position: center top; background-size: cover; background-repeat: no-repeat;">
											<!--[if gte mso 9]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:410px;"><v:fill type="frame" src="" color="#FFFFFF"></v:fill><v:textbox style="v-text-anchor:middle;" inset="0,0,0,0"><![endif]-->
											<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
												<tr>
													<td  style="font-size: 0px; height: 0px; line-height: 0px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle">
														<!--[if (gte mso 9)|(IE)]><table border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
														<table width="180" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:180px;max-width:180px;">
															<tr>
																<td align="center" valign="middle" class="autoheight" height="50"><a href="http://example.com" style="text-decoration:none;border:0px;"><img width="130" border="0" alt="logo" style="width:130px;border:0px;display:inline-block!important;" src="https://editor.maool.com/images/uploads/644815/1720462511-The_Tech_Tune_(1).png"></a></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="20" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:20px;max-width:20px;">
															<tr>
																<td valign="middle" align="center" height="20"></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="320" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:320px;max-width:320px;">
															<tr>
																<td data-menulink="Menulink" height="45" align="right" valign="middle" class="center-text" style="color: #191919; font-family: Poppins, DejaVu Sans, Verdana, sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 0.5px; line-height: 24px;"><a href="thetechtune.com" style="color: #ffffff; text-decoration: none;">The Tech Tune</a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="http://example.com/" style="color: #ffffff; text-decoration: none;">About</a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
													</td>
												</tr>
												<tr>
													<td  style="font-size: 0px; height: 0px; line-height: 0px;">&nbsp;</td>
												</tr>
												<tr>
													<td style="background-color:#E1E1E1;font-size:1px;height:1px;line-height:1px;">&nbsp;</td>
												</tr>
												<tr>
													<td  style="font-size: 9px; height: 9px; line-height: 9px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle">
														<!--[if (gte mso 9)|(IE)]><table border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
														<table width="200" border="0" cellpadding="0" cellspacing="0" align="right" class="row" style="width:200px;max-width:200px;">
															<tr>
																<td align="center" valign="middle"><a href="http://example.com" style="text-decoration:none;border:0px;"><img alt="Hero" border="0" width="200" style="display:block;border:0;width:200px;max-width:200px;border-radius:8px;" src="https://editor.maool.com/images/uploads/644815/1680180593-hero@img-1_(1).png"></a></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="20" border="0" cellpadding="0" cellspacing="0" align="right" class="row" style="width:20px;max-width:20px;">
															<tr>
																<td valign="middle" align="center" height="30"></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="300" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:300px;max-width:300px;">
															<tr>
																<td align="left" valign="middle" class="br-mobile-none center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #191919; font-size: 25px; line-height: 35px; font-weight: 700; letter-spacing: 0.5px; padding: 0px 0px 15px;">Dear&nbsp;<br>Need A Website?</td>
															</tr>
															<tr>
																<td align="left" valign="middle" class="br-mobile-none center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #595959; font-size: 16px; line-height: 26px; font-weight: 400; letter-spacing: 0px; padding: 0px 0px 30px;">If you're ready to take your Rental business to the next step, get your own professional website today. It can put yourrental space out in the digital market and help you inreaching potential customers. An online platform can helpyou expand your business and boost your sales.</td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
													</td>
												</tr>
												<tr>
													<td  style="font-size: 0px; height: 0px; line-height: 0px;">&nbsp;</td>
												</tr>
											</table>
											<!--[if (gte mso 9)|(IE)]></v:textbox></v:rect><![endif]-->
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 100%;">
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
													<td align="center" valign="middle" style="font-family:'Poppins', sans-serif;color:#8844FF;font-size:14px;line-height:24px;font-weight:600;letter-spacing:0.5px;padding:0px;padding-bottom:5px;"></td>
												</tr>
												<tr>
													<td align="center" valign="middle" style="font-family:'Poppins', sans-serif;color:#191919;font-size:28px;line-height:38px;font-weight:700;letter-spacing:0px;padding-bottom:5px;">Our Website Development Services</td>
												</tr>
												<tr>
													<td align="center" valign="middle" class="br-mobile-none" style="font-family: Poppins, sans-serif; color: #595959; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px;">At The Tech Tune, we take a collaborative approach with our clients. We will work closely with you to design, develop and launch a website that will empower your company and meet your business objectives<br><br></td>
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
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
								<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
									<tr>
										<td align="center" class="container-padding" bgcolor="#FFFFFF" background="https://editor.maool.com/images/agency/cta@bg-5.png" style="background-color:#FFFFFF;background-position:center top;background-size:cover;background-repeat:no-repeat;">
											<!--[if gte mso 9]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:560px;"><v:fill type="frame" src="https://editor.maool.com/images/agency/cta@bg-5.png" color="#FFFFFF"></v:fill><v:textbox style="v-text-anchor:middle;" inset="0,0,0,0"><![endif]-->
											<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
												<tr>
													<td  style="font-size: 1px; height: 1px; line-height: 1px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle" style="font-family:'Poppins', sans-serif;color:#ED990D;font-size:16px;line-height:26px;font-weight:600;letter-spacing:0.5px;padding:0;padding-bottom:5px;"></td>
												</tr>
												<tr>
													<td align="center" valign="middle" class="br-mobile-none" style="font-family:'Poppins', sans-serif;color:#FFFFFF;font-size:26px;line-height:36px;font-weight:700;letter-spacing:0px;">Web development Services for Rental Business</td>
												</tr>
												<tr>
													<td  style="font-size: 15px; height: 15px; line-height: 15px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle">
														<!--[if (gte mso 9)|(IE)]><table border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
														<table width="250" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:250px;max-width:250px;">
															<tr>
																<td align="left" valign="middle" class="center-text" style="padding:0px;padding-bottom:10px;"><img alt="Icon" border="0" width="50" style="display:inline-block!important;border:0;width:50px;max-width:50px;" src="https://editor.maool.com/images/uploads/644815/1720461339-Untitled_design_(4).png"></td>
															</tr>
															<tr>
																<td align="left" valign="middle" class="center-text" style="font-family:'Poppins', sans-serif;color:#FFFFFF;font-size:18px;line-height:26px;font-weight:700;letter-spacing:0px;padding:0px;padding-bottom:5px;">Technical Support</td>
															</tr>
															<tr>
																<td align="left" valign="middle" class="br-mobile-none center-text" style="font-family:'Poppins', sans-serif;color:#FFFFFF;font-size:14px;line-height:24px;font-weight:400;letter-spacing:0px;">• Customisation of Theme&nbsp;<br>• Mobile Responsive&nbsp;<br>• Integration Google Maps&nbsp;&nbsp;<br>• Integration Mailing List Plugin<br>• Contact Form / Social Media<br>• 2 Rounds of Revisions&nbsp;<br>• Availability Cal. Management<br>• Free Technical Support for 1 year<br>• Payment gateway Integration</td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="20" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:20px;max-width:20px;">
															<tr>
																<td valign="middle" align="center" height="30"></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="250" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:250px;max-width:250px;">
															<tr>
																<td align="left" valign="middle" class="center-text" style="padding:0px;padding-bottom:10px;"><img alt="Icon" border="0" width="50" style="display:inline-block!important;border:0;width:50px;max-width:50px;" src="https://editor.maool.com/images/uploads/644815/1720461397-Untitled_design_(5).png"></td>
															</tr>
															<tr>
																<td align="left" valign="middle" class="center-text" style="font-family:'Poppins', sans-serif;color:#FFFFFF;font-size:18px;line-height:26px;font-weight:700;letter-spacing:0px;padding:0px;padding-bottom:5px;">Free Hosting server</td>
															</tr>
															<tr>
																<td align="left" valign="middle" class="br-mobile-none center-text" style="font-family:'Poppins', sans-serif;color:#FFFFFF;font-size:14px;line-height:24px;font-weight:400;letter-spacing:0px;">No need to worry about technical stuffwe got it covered for you. The Tech Tune&nbsp; provides you free high speed server to hostyour professional website. Our 24 /7 support system helps your website to be online 24*7 with Zero downtime assurance, so you can never miss your online visibility.</td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
													</td>
												</tr>
												<tr>
													<td  style="font-size: 14px; height: 14px; line-height: 14px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle">
														<!--[if (gte mso 9)|(IE)]><table border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
														<table width="250" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:250px;max-width:250px;">
															<tr>
																<td align="left" valign="middle" class="center-text" style="padding:0px;padding-bottom:10px;"><img alt="Icon" border="0" width="50" style="display:inline-block!important;border:0;width:50px;max-width:50px;" src="https://editor.maool.com/images/uploads/644815/1720461239-Untitled_design_(2).png"></td>
															</tr>
															<tr>
																<td align="left" valign="middle" class="center-text" style="font-family:'Poppins', sans-serif;color:#FFFFFF;font-size:18px;line-height:26px;font-weight:700;letter-spacing:0px;padding:0px;padding-bottom:5px;">Free Domain</td>
															</tr>
															<tr>
																<td align="left" valign="middle" class="br-mobile-none center-text" style="font-family:'Poppins', sans-serif;color:#FFFFFF;font-size:14px;line-height:24px;font-weight:400;letter-spacing:0px;">The Tech Tune provide you free domain of your choosing for 1 Year Choose your website name, and go live hustle free.</td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="20" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:20px;max-width:20px;">
															<tr>
																<td valign="middle" align="center" height="30"></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="250" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:250px;max-width:250px;">
															<tr>
																<td align="left" valign="middle" class="center-text" style="padding:0px;padding-bottom:10px;"><img alt="Icon" border="0" width="50" style="display:inline-block!important;border:0;width:50px;max-width:50px;" src="https://editor.maool.com/images/uploads/644815/1720461181-Untitled_design_(1).png"></td>
															</tr>
															<tr>
																<td align="left" valign="middle" class="center-text" style="font-family:'Poppins', sans-serif;color:#FFFFFF;font-size:18px;line-height:26px;font-weight:700;letter-spacing:0px;padding:0px;padding-bottom:5px;">Free SSL Certificate</td>
															</tr>
															<tr>
																<td align="left" valign="middle" class="br-mobile-none center-text" style="font-family:'Poppins', sans-serif;color:#FFFFFF;font-size:14px;line-height:24px;font-weight:400;letter-spacing:0px;">Get Free SSL Certificate for your websitefor secure connection between you and your customers&nbsp; (l year)</td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
													</td>
												</tr>
												<tr>
													<td  style="font-size:50px;height:50px;line-height:50px;">&nbsp;</td>
												</tr>
											</table>
											<!--[if (gte mso 9)|(IE)]></v:textbox></v:rect><![endif]-->
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
													<td  style="font-size:30px;height:30px;line-height:30px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle">
														<!--[if (gte mso 9)|(IE)]><table border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
														<table width="270" border="0" cellpadding="0" cellspacing="0" align="right" class="row" style="width:270px;max-width:270px;">
															<tr>
																<td align="center" valign="middle"><a href="http://example.com" style="text-decoration:none;border:0px;"><img src="https://editor.maool.com/images/agency/about@img-6.png" alt="About" border="0" width="270" style="display:block;border:0;width:270px;max-width:270px;border-radius:8px;"></a></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="20" border="0" cellpadding="0" cellspacing="0" align="right" class="row" style="width:20px;max-width:20px;">
															<tr>
																<td valign="middle" align="center" height="20"></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="230" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:230px;max-width:230px;">
															<tr>
																<td  valign="middle" align="center" class="autoheight" height="60" style="height: 0px; font-size: 0px; line-height: 0px;"></td>
															</tr>
															<tr>
																<td align="left" valign="middle" class="center-text" style="font-family:'Poppins', sans-serif;color:#3F52C6;font-size:14px;line-height:24px;font-weight:600;letter-spacing:0.5px;padding:0;padding-bottom:5px;"></td>
															</tr>
															<tr>
																<td align="left" valign="middle" class="center-text" style="font-family:'Poppins', sans-serif;color:#191919;font-size:24px;line-height:34px;font-weight:700;letter-spacing:0px;padding:0px;padding-bottom:5px;">Why work with us?</td>
															</tr>
															<tr>
																<td align="left" valign="middle" class="center-text" style="font-family: Poppins, sans-serif; color: #595959; font-size: 18px; line-height: 28px; font-weight: 400; letter-spacing: 0px; padding: 0px 0px 20px;"><b>Navigating the digital space -&nbsp;</b>This isour business, and we have been doing itfor over a decade.&nbsp;<br>We know howwebsite design can make a hugedifference. We know what works andwhat to do to help you grow yourbusiness.<br></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
													</td>
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
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 100%;">
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
													<td  style="font-size: 9px; height: 9px; line-height: 9px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle">
														<!--[if (gte mso 9)|(IE)]><table border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
														<table width="250" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:250px;max-width:250px;">
															<tr>
																<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #191919; font-size: 24px; line-height: 34px; font-weight: 700; letter-spacing: 0px; padding: 0px 0px 10px;">Provide Solution by Our Expert</td>
															</tr>
															<tr>
																<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #595959; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px; padding: 0px 0px 15px;">Make us understand about your project and we will make it alive</td>
															</tr>
															<tr>
																<td align="center" valign="middle" style="padding:0px;padding-bottom:5px;">
																	<table border="0" align="left" cellpadding="0" cellspacing="0" class="center-float">
																		<tr>
																			<td align="center" valign="middle" class="center-text"><img alt="Dot Img" width="10" style="width:10px;" src="https://editor.maool.com/images/agency/icon@img-23.png"></td>
																			<td width="10">&nbsp;</td>
																			<td align="center" valign="middle" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #191919; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px;">Talk more about your project</td>
																		</tr>
																	</table>
																</td>
															</tr>
															<tr>
																<td align="center" valign="middle" style="padding:0px;padding-bottom:5px;">
																	<table border="0" align="left" cellpadding="0" cellspacing="0" class="center-float">
																		<tr>
																			<td align="center" valign="middle" class="center-text"><img alt="Dot Img" width="10" style="width:10px;" src="https://editor.maool.com/images/agency/icon@img-23.png"></td>
																			<td width="10">&nbsp;</td>
																			<td align="center" valign="middle" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #191919; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px;">We help businesses grow fast</td>
																		</tr>
																	</table>
																</td>
															</tr>
															<tr>
																<td align="center" valign="middle">
																	<table border="0" align="left" cellpadding="0" cellspacing="0" class="center-float">
																		<tr>
																			<td align="center" valign="middle" class="center-text"><img alt="Dot Img" width="10" style="width:10px;" src="https://editor.maool.com/images/agency/icon@img-23.png"></td>
																			<td width="10">&nbsp;</td>
																			<td align="center" valign="middle" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #191919; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px;">Change the way for business</td>
																		</tr>
																	</table>
																</td>
															</tr>
															<tr>
																<td valign="middle" align="center" height="20"></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="20" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:20px;max-width:20px;">
															<tr>
																<td valign="middle" align="center" height="30"></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="250" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:250px;max-width:250px;">
															<tr>
																<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #191919; font-size: 24px; line-height: 34px; font-weight: 700; letter-spacing: 0px; padding: 0px 0px 10px;">Soluition for all kind of business</td>
															</tr>
															<tr>
																<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #595959; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px; padding: 0px 0px 15px;">If you have one property or many don't worry we got you covered</td>
															</tr>
															<tr>
																<td align="center" valign="middle" style="padding:0px;padding-bottom:5px;">
																	<table border="0" align="left" cellpadding="0" cellspacing="0" class="center-float">
																		<tr>
																			<td align="center" valign="middle" class="center-text"><img alt="Dot Img" width="10" style="width:10px;" src="https://editor.maool.com/images/agency/icon@img-23.png"></td>
																			<td width="10">&nbsp;</td>
																			<td align="center" valign="middle" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #191919; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px;">Select your theme&nbsp;</td>
																		</tr>
																	</table>
																</td>
															</tr>
															<tr>
																<td align="center" valign="middle" style="padding:0px;padding-bottom:5px;">
																	<table border="0" align="left" cellpadding="0" cellspacing="0" class="center-float">
																		<tr>
																			<td align="center" valign="middle" class="center-text"><img alt="Dot Img" width="10" style="width:10px;" src="https://editor.maool.com/images/agency/icon@img-23.png"></td>
																			<td width="10">&nbsp;</td>
																			<td align="center" valign="middle" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #191919; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px;">Share Details of your property</td>
																		</tr>
																	</table>
																</td>
															</tr>
															<tr>
																<td align="center" valign="middle">
																	<table border="0" align="left" cellpadding="0" cellspacing="0" class="center-float">
																		<tr>
																			<td align="center" valign="middle" class="center-text"><img alt="Dot Img" width="10" style="width:10px;" src="https://editor.maool.com/images/agency/icon@img-23.png"></td>
																			<td width="10">&nbsp;</td>
																			<td align="center" valign="middle" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #191919; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px;">Go online&nbsp;</td>
																		</tr>
																	</table>
																</td>
															</tr>
															<tr>
																<td valign="middle" align="center" height="20"></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
													</td>
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
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 100%;">
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
													<td  style="font-size: 1px; height: 1px; line-height: 1px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle">
														<!--[if (gte mso 9)|(IE)]><table border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
														<table width="250" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:250px;max-width:250px;">
															<tr>
																<td align="center" valign="middle"><a href="http://example.com" style="text-decoration:none;border:0px;"><img alt="About" border="0" width="250" style="display: block; border: 0px; width: 250px; max-width: 250px; border-radius: 0px;" src="https://editor.maool.com/images/uploads/644815/1680180615-about@img-1_(1).png"></a></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="20" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:20px;max-width:20px;">
															<tr>
																<td valign="middle" align="center" height="20"></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="250" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:250px;max-width:250px;">
															<tr>
																<td  valign="middle" align="center" class="autoheight" height="30"></td>
															</tr>
															<tr>
																<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #8844ff; font-size: 14px; line-height: 24px; font-weight: 600; letter-spacing: 0.5px; padding: 0px 0px 5px;">Select Your Theme and get started</td>
															</tr>
															<tr>
																<td align="left" valign="middle" class="br-mobile-none center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #191919; font-size: 20px; line-height: 30px; font-weight: 700; letter-spacing: 0px; padding: 0px 0px 5px;">What colour tone suits your property ?</td>
															</tr>
															<tr>
																<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #595959; font-size: 16px; line-height: 26px; font-weight: 400; letter-spacing: 0px; padding: 0px 0px 30px;">The Right Choice of color contrast and theme gives your website digital life. Select the theme that suits your rental property and give your rental property a digital home!</td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
													</td>
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
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 100%; z-index: 1;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
								<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
									<tr>
										<td align="center" class="container-padding" bgcolor="#FFFFFF" background="" style="background-color:#FFFFFF;background-position:center top;background-size:cover;background-repeat:no-repeat;">
											<!--[if gte mso 9]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:150px;"><v:fill type="frame" src="" color="#FFFFFF"></v:fill><v:textbox style="v-text-anchor:middle;" inset="0,0,0,0"><![endif]-->
											<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
												<tr>
													<td  style="font-size:30px;height:30px;line-height:30px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle">
														<!--[if (gte mso 9)|(IE)]><table border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
														<table width="250" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:250px;max-width:250px;">
															<tr>
																<td align="center">
																	<!--[if (gte mso 9)|(IE)]><table border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
																	<table width="60" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:60px;max-width:60px;">
																		<tr>
																			<td align="center" valign="middle"><a href="http://example.com" style="text-decoration:none;border:0px;"><img alt="Icon" border="0" width="60" style="display:inline-block!important;border:0;width:60px;max-width:60px;" src="https://editor.maool.com/images/uploads/644815/1720529133-Untitled_design_(9).png"></a></td>
																		</tr>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
																	<table width="20" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:20px;max-width:20px;">
																		<tr>
																			<td valign="middle" align="center" height="20"></td>
																		</tr>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
																	<table width="170" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:170px;max-width:170px;">
																		<tr>
																			<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #191919; font-size: 18px; line-height: 28px; font-weight: 700; letter-spacing: 0px; padding: 0px 0px 5px;">Price Management</td>
																		</tr>
																		<tr>
																			<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #595959; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px;">Control your prices of your property</td>
																		</tr>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
																</td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="20" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:20px;max-width:20px;">
															<tr>
																<td valign="middle" align="center" height="30"></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="250" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:250px;max-width:250px;">
															<tr>
																<td align="center">
																	<!--[if (gte mso 9)|(IE)]><table border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
																	<table width="60" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:60px;max-width:60px;">
																		<tr>
																			<td align="center" valign="middle"><a href="http://example.com" style="text-decoration:none;border:0px;"><img alt="Icon" border="0" width="60" style="display:inline-block!important;border:0;width:60px;max-width:60px;" src="https://editor.maool.com/images/uploads/644815/1720529022-Untitled_design_(7).png"></a></td>
																		</tr>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
																	<table width="20" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:20px;max-width:20px;">
																		<tr>
																			<td valign="middle" align="center" height="20"></td>
																		</tr>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
																	<table width="170" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:170px;max-width:170px;">
																		<tr>
																			<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #191919; font-size: 18px; line-height: 28px; font-weight: 700; letter-spacing: 0px; padding: 0px 0px 5px;">Amenities Management</td>
																		</tr>
																		<tr>
																			<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #595959; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px;">Add or remove amenities accordingly</td>
																		</tr>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
																</td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
													</td>
												</tr>
												<tr>
													<td  style="font-size: 21px; height: 21px; line-height: 21px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle">
														<!--[if (gte mso 9)|(IE)]><table border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
														<table width="250" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:250px;max-width:250px;">
															<tr>
																<td align="center">
																	<!--[if (gte mso 9)|(IE)]><table border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
																	<table width="60" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:60px;max-width:60px;">
																		<tr>
																			<td align="center" valign="middle"><a href="http://example.com" style="text-decoration:none;border:0px;"><img alt="Icon" border="0" width="60" style="display:inline-block!important;border:0;width:60px;max-width:60px;" src="https://editor.maool.com/images/uploads/644815/1720470217-1.png"></a></td>
																		</tr>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
																	<table width="20" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:20px;max-width:20px;">
																		<tr>
																			<td valign="middle" align="center" height="20"></td>
																		</tr>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
																	<table width="170" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:170px;max-width:170px;">
																		<tr>
																			<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #191919; font-size: 18px; line-height: 28px; font-weight: 700; letter-spacing: 0px; padding: 0px 0px 5px;">Control</td>
																		</tr>
																		<tr>
																			<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #595959; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px;">Control your Rental Business</td>
																		</tr>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
																</td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="20" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:20px;max-width:20px;">
															<tr>
																<td valign="middle" align="center" height="30"></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="250" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:250px;max-width:250px;">
															<tr>
																<td align="center">
																	<!--[if (gte mso 9)|(IE)]><table border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
																	<table width="60" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:60px;max-width:60px;">
																		<tr>
																			<td align="center" valign="middle"><a href="http://example.com" style="text-decoration:none;border:0px;"><img alt="Icon" border="0" width="60" style="display:inline-block!important;border:0;width:60px;max-width:60px;" src="https://editor.maool.com/images/uploads/644815/1720470217-6.png"></a></td>
																		</tr>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
																	<table width="20" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:20px;max-width:20px;">
																		<tr>
																			<td valign="middle" align="center" height="20"></td>
																		</tr>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
																	<table width="170" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:170px;max-width:170px;">
																		<tr>
																			<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #191919; font-size: 18px; line-height: 28px; font-weight: 700; letter-spacing: 0px; padding: 0px 0px 5px;">Identity</td>
																		</tr>
																		<tr>
																			<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #595959; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px;">Individual Identity of your property</td>
																		</tr>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
																</td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
													</td>
												</tr>
												<tr>
													<td  style="font-size: 10px; height: 10px; line-height: 10px;">&nbsp;</td>
												</tr>
											</table>
											<!--[if (gte mso 9)|(IE)]></v:textbox></v:rect><![endif]-->
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 100%;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
								<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
									<tr>
										<td align="center" class="container-padding" bgcolor="#FFFFFF" background="" style="background-color:#FFFFFF;background-position:center top;background-size:cover;background-repeat:no-repeat;">
											<!--[if gte mso 9]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:150px;"><v:fill type="frame" src="https://editor.maool.com/images/agency/cta@bg-1.png" color="#FFFFFF"></v:fill><v:textbox style="v-text-anchor:middle;" inset="0,0,0,0"><![endif]-->
											<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
												<tr>
													<td  style="font-size: 16px; height: 16px; line-height: 16px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle">
														<!--[if (gte mso 9)|(IE)]><table border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
														<table width="250" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:250px;max-width:250px;">
															<tr>
																<td align="center">
																	<!--[if (gte mso 9)|(IE)]><table border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
																	<table width="60" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:60px;max-width:60px;">
																		<tr>
																			<td align="center" valign="middle"><a href="http://example.com" style="text-decoration:none;border:0px;"><img alt="Icon" border="0" width="60" style="display:inline-block!important;border:0;width:60px;max-width:60px;" src="https://editor.maool.com/images/uploads/644815/1720470217-5.png"></a></td>
																		</tr>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
																	<table width="20" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:20px;max-width:20px;">
																		<tr>
																			<td valign="middle" align="center" height="20"></td>
																		</tr>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
																	<table width="170" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:170px;max-width:170px;">
																		<tr>
																			<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #191919; font-size: 18px; line-height: 28px; font-weight: 700; letter-spacing: 0px; padding: 0px 0px 5px;">Value</td>
																		</tr>
																		<tr>
																			<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #595959; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px;">Add Brand Value to your rental business</td>
																		</tr>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
																</td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="20" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:20px;max-width:20px;">
															<tr>
																<td valign="middle" align="center" height="30"></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="250" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:250px;max-width:250px;">
															<tr>
																<td align="center">
																	<!--[if (gte mso 9)|(IE)]><table border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
																	<table width="60" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:60px;max-width:60px;">
																		<tr>
																			<td align="center" valign="middle"><a href="http://example.com" style="text-decoration:none;border:0px;"><img alt="Icon" border="0" width="60" style="display:inline-block!important;border:0;width:60px;max-width:60px;" src="https://editor.maool.com/images/uploads/644815/1720470217-4.png"></a></td>
																		</tr>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
																	<table width="20" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:20px;max-width:20px;">
																		<tr>
																			<td valign="middle" align="center" height="20"></td>
																		</tr>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
																	<table width="170" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:170px;max-width:170px;">
																		<tr>
																			<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #191919; font-size: 18px; line-height: 28px; font-weight: 700; letter-spacing: 0px; padding: 0px 0px 5px;">Direct Bookings</td>
																		</tr>
																		<tr>
																			<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #595959; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px;">Make Direct Booking for your&nbsp;guest</td>
																		</tr>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
																</td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
													</td>
												</tr>
												<tr>
													<td  style="font-size: 0px; height: 0px; line-height: 0px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle">
														<!--[if (gte mso 9)|(IE)]><table border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
														<table width="250" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:250px;max-width:250px;">
															<tr>
																<td align="center">
																	<!--[if (gte mso 9)|(IE)]><table border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
																	<table width="60" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:60px;max-width:60px;">
																		<tbody></tbody>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
																	<table width="20" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:20px;max-width:20px;">
																		<tr>
																			<td valign="middle" align="center" height="20"></td>
																		</tr>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
																	<table width="170" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:170px;max-width:170px;">
																		<tr>
																			<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #191919; font-size: 18px; line-height: 28px; font-weight: 700; letter-spacing: 0px; padding: 0px 0px 5px;"></td>
																		</tr>
																		<tr>
																			<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #595959; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px;"></td>
																		</tr>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
																</td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="20" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:20px;max-width:20px;">
															<tr>
																<td valign="middle" align="center" height="30"></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="250" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:250px;max-width:250px;">
															<tr>
																<td align="center">
																	<!--[if (gte mso 9)|(IE)]><table border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
																	<table width="60" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:60px;max-width:60px;">
																		<tbody></tbody>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
																	<table width="20" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:20px;max-width:20px;">
																		<tr>
																			<td valign="middle" align="center" height="20"></td>
																		</tr>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
																	<table width="170" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:170px;max-width:170px;">
																		<tr>
																			<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #191919; font-size: 18px; line-height: 28px; font-weight: 700; letter-spacing: 0px; padding: 0px 0px 5px;"></td>
																		</tr>
																		<tr>
																			<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #595959; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px;"></td>
																		</tr>
																	</table>
																	<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
																</td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
													</td>
												</tr>
												<tr>
													<td  style="font-size: 0px; height: 0px; line-height: 0px;">&nbsp;</td>
												</tr>
											</table>
											<!--[if (gte mso 9)|(IE)]></v:textbox></v:rect><![endif]-->
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		<table border="0" width="100%" align="center" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 100%; z-index: 1;">
			<tr>
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #F1F1F1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
								<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
									<tr>
										<td align="center" class="container-padding" bgcolor="#FFFFFF" background="https://editor.maool.com/images/agency/cta@bg-11.png" style="background-color:#FFFFFF;background-position:center top;background-size:cover;background-repeat:no-repeat;">
											<!--[if gte mso 9]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:290px;"><v:fill type="frame" src="https://editor.maool.com/images/agency/cta@bg-11.png" color="#FFFFFF"></v:fill><v:textbox style="v-text-anchor:middle;" inset="0,0,0,0"><![endif]-->
											<table border="0" width="520" align="center" cellpadding="0" cellspacing="0" class="row" style="width:520px;max-width:520px;">
												<tr>
													<td  style="font-size: 63px; height: 63px; line-height: 63px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #ffffff; font-size: 28px; line-height: 38px; font-weight: 600; letter-spacing: 0.5px;">Our Believes</td>
												</tr>
												<tr>
													<td align="left" valign="middle" class="br-mobile-none center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #ffffff; font-size: 14px; line-height: 24px; font-weight: 700; letter-spacing: 0px; padding: 0px 0px 20px;">The Tech tune believes in streamlining&nbsp;<br>the process of rental business by reducing&nbsp;<br>complexities and inconveniences.&nbsp;<br>The rental websites generated for the clients are&nbsp;<br>Equipped with all the necessary features&nbsp;<br>and functions.</td>
												</tr>
												<tr>
													<td  style="font-size:50px;height:50px;line-height:50px;">&nbsp;</td>
												</tr>
											</table>
											<!--[if (gte mso 9)|(IE)]></v:textbox></v:rect><![endif]-->
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
							<td align="center" bgcolor="#FFFFFF" style="background-color: #FFFFFF;">
								<table width="520" border="0" cellpadding="0" cellspacing="0" align="center" class="row" style="width:520px;max-width:520px;">
									<tr>
										<td align="center" class="container-padding">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
												<tr>
													<td  style="font-size:30px;height:30px;line-height:30px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle">
														<!--[if (gte mso 9)|(IE)]><table border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
														<table width="200" border="0" cellpadding="0" cellspacing="0" align="right" class="row" style="width:200px;max-width:200px;">
															<tr>
																<td align="center" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #191919; font-size: 38px; line-height: 48px; font-weight: 600; letter-spacing: 0px; padding: 0px 0px 20px;">€299</td>
															</tr>
															<tr>
																<td align="center" valign="middle">
																	<table border="0" align="center" cellpadding="0" cellspacing="0" class="center-float">
																		<tr>
																			<td align="center" style="display: block; background-color: #8844ff; border-radius: 50px;"><a href="https://thetechtune.com/rental.php" style="color: #fffafa; font-family: Poppins, DejaVu Sans, Verdana, sans-serif; font-size: 14px; font-weight: 600; letter-spacing: 0.5px; line-height: 24px; display: block; text-decoration: none; white-space: nowrap; padding: 12px 30px;">Know More</a></td>
																		</tr>
																	</table>
																</td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="20" border="0" cellpadding="0" cellspacing="0" align="right" class="row" style="width:20px;max-width:20px;">
															<tr>
																<td valign="middle" align="center" height="20"></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="1" border="0" cellpadding="0" cellspacing="0" align="right" class="row" style="width:1px;max-width:1px;">
															<tr>
																<td class="autoheight" style="background-color:#f1f1f1;font-size:1px;height:120px;line-height:1px;">&nbsp;</td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="20" border="0" cellpadding="0" cellspacing="0" align="right" class="row" style="width:20px;max-width:20px;">
															<tr>
																<td valign="middle" align="center" height="20"></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="279" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:279px;max-width:279px;">
															<tr>
																<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #191919; font-size: 16px; line-height: 26px; font-weight: 700; letter-spacing: 0px; padding: 0px 0px 5px;"></td>
															</tr>
															<tr>
																<td align="center" valign="middle" style="padding:0px;padding-bottom:5px;">
																	<table align="left" border="0" cellpadding="0" cellspacing="0" class="center-float">
																		<tr>
																			<td align="center" valign="middle"><img width="16" border="0" alt="icon" style="width:16px;border:0px;display:inline-block !important;" src="https://editor.maool.com/images/agency/icon@img-5.png"></td>
																			<td width="10">&nbsp;</td>
																			<td align="left" valign="middle" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #595959; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px;">Technical Support</td>
																		</tr>
																	</table>
																</td>
															</tr>
															<tr>
																<td align="center" valign="middle" style="padding:0px;padding-bottom:5px;">
																	<table align="left" border="0" cellpadding="0" cellspacing="0" class="center-float">
																		<tr>
																			<td align="center" valign="middle"><img width="16" border="0" alt="icon" style="width:16px;border:0px;display:inline-block !important;" src="https://editor.maool.com/images/agency/icon@img-5.png"></td>
																			<td width="10">&nbsp;</td>
																			<td align="left" valign="middle" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #595959; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px;">Free Domain &amp; Hosting server</td>
																		</tr>
																	</table>
																</td>
															</tr>
															<tr>
																<td align="center" valign="middle" style="padding:0px;padding-bottom:5px;">
																	<table align="left" border="0" cellpadding="0" cellspacing="0" class="center-float">
																		<tr>
																			<td align="center" valign="middle"><img width="16" border="0" alt="icon" style="width:16px;border:0px;display:inline-block !important;" src="https://editor.maool.com/images/agency/icon@img-5.png"></td>
																			<td width="10">&nbsp;</td>
																			<td align="left" valign="middle" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #595959; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px;">Free SSL Certificate<br></td>
																		</tr>
																	</table>
																</td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
													</td>
												</tr>
												<tr>
													<td  style="font-size: 27px; height: 27px; line-height: 27px;">&nbsp;</td>
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
				<td align="center" valign="middle" bgcolor="#F1F1F1" style="background-color: #f1f1f1;">
					<table border="0" width="600" align="center" cellpadding="0" cellspacing="0" class="row" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="#191919" style="background-color: #ffffff;">
								<table width="520" border="0" cellpadding="0" cellspacing="0" align="center" class="row" style="width:520px;max-width:520px;">
									<tr>
										<td align="center" class="container-padding">
											<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:100%;">
												<tr>
													<td  style="font-size:40px;height:40px;line-height:40px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle">
														<!--[if (gte mso 9)|(IE)]><table border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
														<table width="180" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:180px;max-width:180px;">
															<tr>
																<td align="left" valign="middle" class="center-text" style="padding:0px;padding-bottom:20px;"><a href="http://example.com" style="text-decoration:none;border:0px;"><img width="180" border="0" alt="logo" style="width: 180px; border: 0px; display: inline-block !important;" src="https://editor.maool.com/images/uploads/644815/1720463665-Traveltastic_(5).pdf_(3).png"></a></td>
															</tr>
															<tr>
																<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #ffffff; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px; padding: 0px 0px 10px;"></td>
															</tr>
															<tr>
																<td align="center" valign="middle">
																	<table cellpadding="0" cellspacing="0" align="left" class="center-float" style="border:0;border-collapse:collapse;border-spacing:0;">
																		<tr></tr>
																	</table>
																</td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="20" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:20px;max-width:20px;">
															<tr>
																<td valign="middle" align="center" height="20"></td>
															</tr>
														</table>
														<table width="170" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:170px;max-width:170px;">
															<tr>
																<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #000000; font-size: 16px; line-height: 26px; font-weight: 600; letter-spacing: 0px; padding: 0px 0px 20px;">Contact Info</td>
															</tr>
															<tr>
																<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #000000; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px;">Call us: <br>+91 8604-123492&nbsp;<br>E-mail us: <br>info@thetechtune.com</td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="20" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:20px;max-width:20px;">
															<tr>
																<td valign="middle" align="center" height="20"></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="130" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:130px;max-width:130px;">
															<tr>
																<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #000000; font-size: 16px; line-height: 26px; font-weight: 600; letter-spacing: 0px; padding: 0px 0px 20px;">Address</td>
															</tr>
															<tr>
																<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #000000; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px;">117/N/70 3rd Floor Kakadeo,&nbsp;<br>208025</td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
													</td>
												</tr>
												<tr>
													<td  style="font-size: 0px; height: 0px; line-height: 0px;">&nbsp;</td>
												</tr>
												<tr>
													<td style="background-color:#E1E1E1;font-size:1px;height:1px;line-height:1px;">&nbsp;</td>
												</tr>
												<tr>
													<td  style="font-size: 0px; height: 0px; line-height: 0px;">&nbsp;</td>
												</tr>
												<tr>
													<td align="center" valign="middle">
														<!--[if (gte mso 9)|(IE)]><table border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
														<table width="320" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:320px;max-width:320px;">
															<tr>
																<td align="left" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #000000; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px;">@2024 The tech tune All Rights Reserved.</td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="20" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:20px;max-width:20px;">
															<tr>
																<td valign="middle" align="center" height="20"></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->
														<table width="180" border="0" cellpadding="0" cellspacing="0" align="left" class="row" style="width:180px;max-width:180px;">
															<tr>
																<td align="right" valign="middle" class="center-text" style="font-family: Poppins, DejaVu Sans, Verdana, sans-serif; color: #ffffff; font-size: 14px; line-height: 24px; font-weight: 400; letter-spacing: 0px;"><br></td>
															</tr>
														</table>
														<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
													</td>
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
