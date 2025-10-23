import React, { createContext, useContext, ReactNode } from 'react';
import {cylinderHeatingService, excelService, holdingPressureService, scanService} from "./services";
import {dosingService, injectionService} from "@/features/api/services";


interface ApiContextType {
    scanService: typeof scanService;
    injectionService: typeof injectionService;
    dosingService: typeof dosingService;
    holdingPressureService: typeof holdingPressureService;
    cylinderHeatingService: typeof cylinderHeatingService;
    excelService: typeof excelService;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

interface ApiProviderProps {
    children: ReactNode;
}

export function ApiProvider({ children }: ApiProviderProps) {
    const apiServices: ApiContextType = {
        scanService,
        injectionService,
        dosingService,
        holdingPressureService,
        cylinderHeatingService,
        excelService,
    };

    return (
        <ApiContext.Provider value={apiServices}>
            {children}
        </ApiContext.Provider>
    );
}

export function useApiContext(): ApiContextType {
    const context = useContext(ApiContext);
    if (context === undefined) {
        throw new Error('useApiContext must be used within an ApiProvider');
    }
    return context;
}

export default ApiContext;