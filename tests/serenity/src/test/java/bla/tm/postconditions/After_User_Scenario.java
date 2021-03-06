package bla.tm.postconditions;

import bla.tm.steps.AnyPageSteps;
import net.thucydides.core.annotations.Steps;
import org.jbehave.core.annotations.AfterScenario;

public class After_User_Scenario {
    @Steps
    AnyPageSteps anyPageSteps;

    @AfterScenario()
    public void clearCookiesAndLocalStorage (){
        anyPageSteps.clearCookiesAndLocalStorage();
    }
}
