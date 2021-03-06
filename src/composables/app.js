import { computed } from "vue";
import { utils } from 'src/utils';
import { useStore } from 'vuex';
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router';
import { ApiService } from 'src/services/api';
import { AppMenus } from 'src/menus';

export function useApp() {
	const store = useStore();
	const route = useRoute();
	const router = useRouter();
	const $q = useQuasar();
	const menus = AppMenus;
	
	function isDialogOpen(){
		return store.getters["app/isDialogOpen"];
	}

	function isDesktop() {
		return window.innerWidth >= 992;
	}
	
	function openPageDialog (pageData) {
		store.dispatch('app/openPageDialog', pageData);
	}

	function openPageDrawer (pageData) {
		store.dispatch('app/openPageDrawer', pageData);
	}

	function closeDialogs () {
		store.dispatch("app/closeDialogs");
	}

	function setPageTitle (title) {
		document.title = title;
	}

	function flashMsg(title, detail=null, color='positive') {
		
		let position = "top";
		let icon = "check_circle";

		if(color == "negative"){
			icon = "error"
		}

		if(title){
			$q.notify({
				message: title,
				caption: detail,
				position,
				icon,
				color,
				timeout: 3000
			});
		}
	}

	function navigateTo (path) {
		if(path && route.path !== path){
			router.push(path)
		}
	}

	function showPageRequestError(error) {
		console.error(error);
		const xhrRequest = error?.request;
		const defaultMsg = "Error processing request!";  // if error is not a api request error.
		let errorMsgs = [defaultMsg];
		if (xhrRequest) {
			let errorData = xhrRequest.response;
			if (typeof (errorData) === 'string') {
				try {
					// if error message is valid json data
					errorData = JSON.parse(errorData);
				}
				catch (ex) {
					//not a valid json. Display as simple message
					//console.error(ex);
				}
			}
			if (Array.isArray(errorData)) {
				errorMsgs = errorData;
			}
			else if (typeof (errorData) === 'object') {
				errorMsgs = Object.values(errorData);
			}
			else {
				errorMsgs = [errorData.toString()]
			}
		}
		store.dispatch('app/showPageErrors', errorMsgs);
		if (xhrRequest?.status == 401) { //token might have expired
			//logout user and navigate to login page
			startLogOut();
			location.href = "/";
		}
	}


	function exportPageRecords (pageExportFormats, currentPageUrl, pageName) {
		let actions = [];
		pageExportFormats.forEach(format => {
			actions.push(menus.exportFormats[format]);
		});

		let message = "Export";
		$q.bottomSheet({
			message,
			grid: false,
			actions
		}).onOk(action => {
			let selectedExport = menus.exportFormats[action.id];
			let queryParam = {
				export: action.id
			}
			let exportUrl = utils.setApiPath(currentPageUrl, queryParam);
			let fileName = `${utils.dateNow()}-${pageName}.${selectedExport.ext}`;
			$q.loading.show();
			ApiService.download(exportUrl).then((response) => {
				const url = window.URL.createObjectURL(new Blob([response.data]));
				const link = document.createElement('a');
				link.href = url;
				link.setAttribute('download', fileName);
				document.body.appendChild(link);
				link.click();
				link.remove();
				$q.loading.hide();
			},
			(error) => {
				$q.loading.hide();
				console.error(error);
				alert("Unable to download file")
			});
		}).onCancel(() => {
			// console.log('Dismissed')
		}).onDismiss(() => {
			// console.log('I am triggered on both OK and Cancel')
		})
	}

	function startLogOut () {
		store.dispatch('auth/logout');
	}

	return {
		isDialogOpen,
		isDesktop,
		startLogOut,
		openPageDialog,
		openPageDrawer,
		closeDialogs,
		setPageTitle,
		flashMsg,
		navigateTo,
		showPageRequestError,
		exportPageRecords,
		menus
	}
}