			function selectCurrent(selection){
				selection.classed('current', true);
				selection.moveToFront();
			}

			function unselectCurrent(selection){
				selection.classed('current', false);
			}