import { Api } from "./ApiConstants";
import Localdb from "./Localdb";

export default class Chatbot {
    conversationId: string | null;

    constructor() {
        this.conversationId = null;
    }

    async reset(){
        this.conversationId = null;
    }

    getContextMetadata(){
        const exerciseHistory = Localdb.getExerciseHistory();
        // return {
        //     exerciseHistory: exerciseHistory
        // }
        return null;
    }

    async getChatbotResponse(message: string) {
        try {
            console.log("Message: ", message, "TO:", this.conversationId);
            
            const response = await Api.post(Api.CHATBOT_URL, {
                message: message,
                conversation_id: this.conversationId,
                context: this.getContextMetadata()
            });
            if (response.status >= 200 && response.status < 300) {
                const responseJson = response.responseJson;
                this.conversationId = responseJson.conversation_id;
                
                // Ensure we're returning a properly formatted message object
                const messageObj = responseJson.message;
                
                // If it's already a proper object, return it
                if (typeof messageObj === 'object' && messageObj !== null) {
                    return messageObj;
                }
                
                // If it's a string that might contain JSON, try to parse it
                if (typeof messageObj === 'string' && messageObj.includes('{')) {
                    try {
                        // Try to extract JSON from the string
                        const jsonMatch = messageObj.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const parsedObj = JSON.parse(jsonMatch[0]);
                            return parsedObj;
                        }
                    } catch (e) {
                        console.log("Failed to parse JSON in response", e);
                    }
                }
                
                // Fallback to basic text response
                return {
                    tool: "",
                    query: "",
                    conversation_text: messageObj,
                    search_results: []
                };
            }
            return {
                tool: "",
                query: "",
                conversation_text: 'Sorry, something went wrong.',
                search_results: []
            };
        } catch (error) {
            console.log("Error in getting chatbot response: ", error);
            return null;
        }
    }

}